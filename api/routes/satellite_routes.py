import uuid
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException

from core.schemas import AnalysisRequest
from core.hcs_logger import send_to_node
from satellite_analysis.services.analysis_engine import analysis_engine

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze/vegetation")
async def analyze_vegetation(request: AnalysisRequest):
    try:
        prediction_id = str(uuid.uuid4())
        logger.info(f"Starting vegetation analysis for farmer: {request.farmer_id}")

        raw_result = analysis_engine.analyze_vegetation(request.boundaries)

        result = {
            "type": "satellite_imagery",
            "status": "success",
            "prediction_id": prediction_id,
            "result": raw_result,
            "metadata": {
                "timestamp": datetime.now(ZoneInfo("UTC")).isoformat(),
                "model_version": "1.0.0",
                "crop_type": request.crop_type,
                "planting_date": request.planting_date,
                "farmer_id": request.farmer_id,
                "agent": "CropWatchAgent",
            },
            "bonus_status": None,
        }

        proof_response = send_to_node(result)

        result["hedera_proof"] = proof_response.get("proof")
        result["reward_status"] = proof_response.get("rewardStatus")

        if proof_response.get("nft"):
            result["nft"] = {
                "tokenId": proof_response["nft"].get("tokenId"),
                "serial": proof_response["nft"].get("serial"),
                "ipfs_cid": proof_response["nft"].get("ipfsCid"),
            }

        logger.info(f"Vegetation analysis complete for prediction_id: {prediction_id}")
        return result

    except Exception as e:
        logger.error(f"Vegetation analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")