import uuid
import time
import json
import logging
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, HTTPException

from core.schemas import IrrigationRequest
from core.hcs_logger import send_to_node, _fallback_save
from agents.advisory_agent import get_advice

router = APIRouter()
logger = logging.getLogger(__name__)

_irrigation_model = None
_irrigation_scaler = None
_irrigation_features = None


def init_irrigation_router(model, scaler, features):
    global _irrigation_model, _irrigation_scaler, _irrigation_features
    _irrigation_model = model
    _irrigation_scaler = scaler
    _irrigation_features = features


@router.post("/irrigation/predict")
async def predict_irrigation(payload: IrrigationRequest):
    try:
        prediction_id = str(uuid.uuid4())
        start_time = time.time()

        data = pd.DataFrame([{
            "Soil Moisture": payload.soil_moisture,
            "Temperature": payload.temperature,
            "Air Humidity": payload.air_humidity,
        }])

        scaled = _irrigation_scaler.transform(data[_irrigation_features])
        proba_on = _irrigation_model.predict_proba(scaled)[0][1]
        proba_off = 1 - proba_on
        status = "ON" if proba_on > 0.5 else "OFF"
        recommendation = (
            "Irrigate now — soil appears dry!"
            if status == "ON"
            else "No irrigation needed — soil moisture is sufficient."
        )

        latency_ms = int((time.time() - start_time) * 1000)

        advice_result = await get_advice(
            disease=f"Irrigation recommendation — {status}",
            crop="farm crops",
            confidence=max(proba_on, proba_off),
            farmer_id=payload.farmer_id,
            detection_source="irrigation_model",
            extra_context={
                "irrigation_status": status,
                "probability_on": round(proba_on, 3),
                "probability_off": round(proba_off, 3),
                "soil_moisture": payload.soil_moisture,
                "temperature": payload.temperature,
                "air_humidity": payload.air_humidity,
            },
        )

        result = {
            "status": "success",
            "prediction_id": prediction_id,
            "type": "irrigation_recommendation",
            "result": {
                "status": status,
                "probability_on": round(proba_on, 3),
                "probability_off": round(proba_off, 3),
                "recommendation": recommendation,
                "advice": advice_result["advice"],
                "advice_source": advice_result["source"],
            },
            "input": {
                "soil_moisture": payload.soil_moisture,
                "temperature": payload.temperature,
                "air_humidity": payload.air_humidity,
            },
            "alternative": [],
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "farmer_id": payload.farmer_id,
                "model_version": "1.0.0",
                "latency_ms": latency_ms,
                "agent": "DataMarketplaceAgent",
            },
        }

        try:
            proof_response = send_to_node(result)
            result["hedera_proof"] = proof_response.get("proof")
            result["reward_status"] = proof_response.get("rewardStatus")

            if proof_response.get("nft"):
                result["nft"] = {
                    "tokenId": proof_response["nft"].get("tokenId"),
                    "serial": proof_response["nft"].get("serial"),
                    "ipfs_cid": proof_response["nft"].get("ipfsCid"),
                }
        except Exception as e:
            logger.warning(f"Failed to log irrigation prediction {prediction_id}: {e}")
            _fallback_save(prediction_id, result)

        logger.info(json.dumps({"prediction_id": prediction_id, "type": "irrigation_recommendation"}))
        return result

    except Exception as e:
        logger.error(f"Irrigation prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")