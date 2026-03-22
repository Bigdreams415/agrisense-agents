import uuid
import time
import json
import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from core.schemas import YieldRequest
from core.hcs_logger import send_to_node, _fallback_save
from agents.advisory_agent import get_advice

router = APIRouter()
logger = logging.getLogger(__name__)

YIELD_FEATURES = [
    "Area", "Year", "average_rain_fall_mm_per_year", "pesticides_tonnes", "avg_temp",
    "rain_lag", "pest_temp_interact", "rain_pest_interact",
    "Item_1", "Item_2", "Item_3", "Item_4", "Item_5",
    "Item_6", "Item_7", "Item_8", "Item_9",
]

CROP_MAP = {
    "maize":     [1,0,0,0,0,0,0,0,0],
    "rice":      [0,1,0,0,0,0,0,0,0],
    "cassava":   [0,0,1,0,0,0,0,0,0],
    "yam":       [0,0,0,1,0,0,0,0,0],
    "groundnut": [0,0,0,0,1,0,0,0,0],
    "sorghum":   [0,0,0,0,0,1,0,0,0],
    "millet":    [0,0,0,0,0,0,1,0,0],
    "beans":     [0,0,0,0,0,0,0,1,0],
    "wheat":     [0,0,0,0,0,0,0,0,1],
}

_yield_model = None
_yield_label_encoder = None


def init_yield_router(model, label_encoder):
    global _yield_model, _yield_label_encoder
    _yield_model = model
    _yield_label_encoder = label_encoder


def _prepare_features(data: dict) -> pd.DataFrame:
    df = pd.DataFrame([{
        "Area": data.get("Area", ""),
        "Year": data.get("Year", 0),
        "avg_temp": data.get("avg_temp", 0.0),
        "average_rain_fall_mm_per_year": data.get("average_rain_fall_mm_per_year", 0.0),
        "pesticides_tonnes": data.get("pesticides_tonnes", 0.0),
        "crop_type": data.get("crop_type", ""),
    }])

    df["rain_lag"] = df["average_rain_fall_mm_per_year"] * 0.08
    df["pest_temp_interact"] = df["avg_temp"] * df["pesticides_tonnes"]
    df["rain_pest_interact"] = df["average_rain_fall_mm_per_year"] * df["pesticides_tonnes"]

    item_vals = CROP_MAP.get(df.at[0, "crop_type"].lower(), [0] * 9)
    for i, val in enumerate(item_vals, start=1):
        df[f"Item_{i}"] = val

    area = df.at[0, "Area"]
    if area not in _yield_label_encoder.classes_:
        _yield_label_encoder.classes_ = np.append(_yield_label_encoder.classes_, area)
    df["Area"] = _yield_label_encoder.transform([area])

    df = df.reindex(columns=YIELD_FEATURES, fill_value=0.0)
    return df


def _yield_quality_label(prediction: float) -> str:
    if prediction > 60000:
        return "excellent"
    elif prediction > 40000:
        return "good"
    elif prediction > 25000:
        return "average"
    else:
        return "low"


@router.post("/yield/predict")
async def predict_yield(payload: YieldRequest):
    try:
        prediction_id = str(uuid.uuid4())
        start_time = time.time()

        df = _prepare_features(payload.dict())
        prediction = round(float(_yield_model.predict(df)[0]), 2)
        latency_ms = int((time.time() - start_time) * 1000)

        quality = _yield_quality_label(prediction)

        advice_result = await get_advice(
            disease=f"Yield prediction — {quality} yield",
            crop=payload.crop_type,
            confidence=1.0,
            farmer_id=payload.farmer_id,
            detection_source="yield_model",
            extra_context={
                "predicted_yield_hg_per_ha": prediction,
                "yield_quality": quality,
                "area": payload.Area,
                "year": payload.Year,
                "avg_temp": payload.avg_temp,
                "rainfall_mm": payload.average_rain_fall_mm_per_year,
                "pesticides_tonnes": payload.pesticides_tonnes,
            },
        )

        result = {
            "status": "success",
            "prediction_id": prediction_id,
            "type": "yield_prediction",
            "result": {
                "Area": payload.Area,
                "Year": payload.Year,
                "Crop_Type": payload.crop_type,
                "Predicted_Yield_hg_per_ha": prediction,
                "yield_quality": quality,
                "advice": advice_result["advice"],
                "advice_source": advice_result["source"],
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
            logger.warning(f"Failed to log yield prediction {prediction_id}: {e}")
            _fallback_save(prediction_id, result)

        logger.info(json.dumps({"prediction_id": prediction_id, "type": "yield_prediction"}))
        return result

    except Exception as e:
        logger.error(f"Yield prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")