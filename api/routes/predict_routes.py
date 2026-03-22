import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
import numpy as np

from agents.advisory_agent import get_advice
from core.hcs_logger import send_to_node, _fallback_save
from tools.disease_detection import run_detection

router = APIRouter()
logger = logging.getLogger(__name__)

_model = None
_class_dict = None


def init_predict_router(model, class_dict):
    global _model, _class_dict
    _model = model
    _class_dict = class_dict


@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    farmer_id: str = Form(default=None),
    background_tasks: BackgroundTasks = None,
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid input. Please upload a clear image of a single leaf.",
            )

        prediction_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            image_bytes = await file.read()
            image_hash = hashlib.sha256(image_bytes).hexdigest()
        except Exception as e:
            logger.error(f"Image read error: {e}")
            raise HTTPException(status_code=400, detail="Could not read image file.")

        try:
            detection = run_detection(image_bytes, _model, _class_dict)
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="Invalid image file.")
        except Exception as e:
            logger.error(f"Detection error: {e}")
            raise HTTPException(status_code=400, detail="Could not process image.")

        latency_ms = int((time.time() - start_time) * 1000)

        if detection["is_non_plant"]:
            result = {
                "status": "success",
                "prediction_id": prediction_id,
                "type": "pest_detection",
                "result": {
                    "crop": "Non-plant",
                    "disease": "Non-plant object",
                    "confidence": detection["confidence"],
                    "advice": (
                        "This image appears to be a non-plant object. "
                        "Please upload a clear photo of a plant leaf for pest detection. "
                        "Ensure good lighting and focus on affected areas."
                    ),
                    "advice_source": "system",
                },
                "alternative": [],
                "metadata": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "farmer_id": farmer_id,
                    "image_filename": file.filename,
                    "image_size_bytes": len(image_bytes),
                    "image_hash_sha256": image_hash,
                    "latency_ms": latency_ms,
                    "model_version": "2.0.0-finetuned",
                    "agent": "AdvisoryAgent",
                },
            }
        else:
            advice_result = await get_advice(
                disease=detection["disease"],
                crop=detection["crop"],
                confidence=detection["confidence"],
                farmer_id=farmer_id,
                detection_source="upload",
            )

            result = {
                "status": "success",
                "prediction_id": prediction_id,
                "type": "pest_detection",
                "result": {
                    "crop": detection["crop"],
                    "disease": detection["disease"],
                    "confidence": detection["confidence"],
                    "advice": advice_result["advice"],
                    "advice_source": advice_result["source"],
                },
                "alternative": [
                    {
                        "disease": alt["label"].split("___")[-1].replace("_", " "),
                        "confidence": alt["confidence"],
                    }
                    for alt in detection["alternatives"]
                ],
                "metadata": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "farmer_id": farmer_id,
                    "image_filename": file.filename,
                    "image_size_bytes": len(image_bytes),
                    "image_hash_sha256": image_hash,
                    "latency_ms": latency_ms,
                    "model_version": "2.0.0-finetuned",
                    "agent": "AdvisoryAgent",
                },
            }

        try:
            proof_response = send_to_node(result)

            result["hedera_proof"] = {
                "consensusTimestamp": proof_response.get("proof", {}).get("consensusTimestamp"),
                "status": proof_response.get("proof", {}).get("status", "SUCCESS"),
                "transactionId": proof_response.get("contractProof"),
            }
            result["reward_status"] = {
                "amount": "1 ASAI",
                "type": "utility_token",
                "status": proof_response.get("legacyRewardStatus", "unknown"),
                "message": "Base reward for analysis",
            }

            disease_lower = result["result"]["disease"].lower()
            if disease_lower != "healthy" and not detection["is_non_plant"]:
                result["bonus_status"] = {
                    "type": "pest_detection_bonus",
                    "status": proof_response.get("contractRewardStatus", "unknown"),
                    "message": "Additional bonus queued for pest detection",
                }

            if proof_response.get("nft"):
                result["nft"] = {
                    "tokenId": proof_response["nft"].get("tokenId"),
                    "serial": proof_response["nft"].get("serial"),
                    "ipfs_cid": proof_response["nft"].get("ipfsCid"),
                }

        except Exception as e:
            logger.warning(f"Failed to log prediction {prediction_id} to Node.js: {e}")
            _fallback_save(prediction_id, result)

        logger.info(json.dumps({"prediction_id": prediction_id, "disease": result["result"]["disease"]}))
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")