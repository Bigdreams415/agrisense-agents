import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Union, List

from agents.advisory_agent import get_advice
from tools.disease_detection import run_detection
from satellite_analysis.services.analysis_engine import analysis_engine
from core.hcs_logger import send_to_node

logger = logging.getLogger(__name__)

_pest_model = None
_class_dict = None


def init_orchestrator(model, class_dict):
    global _pest_model, _class_dict
    _pest_model = model
    _class_dict = class_dict


async def run_farm_analysis(
    farmer_id: str,
    boundaries: Union[List[List[float]], List[float]],
    image_bytes: Optional[bytes] = None,
    crop_type: Optional[str] = None,
    location_hint: Optional[str] = None,
) -> dict:
    """
    Master agent — coordinates all sub-agents for a full farm analysis.

    Flow:
    1. CropWatch Agent  → runs satellite NDVI/NDWI analysis
    2. Advisory Agent   → generates Gemini advice if image provided
    3. Logs both agent decisions to HCS via Node.js
    4. Returns unified farm report
    """
    session_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    agent_log = []

    logger.info(f"Orchestrator starting farm analysis — session={session_id}, farmer={farmer_id}")

    # AGENT 1: CropWatch — Satellite Analysis
    satellite_result = None
    try:
        logger.info(f"[CropWatchAgent] Running satellite analysis for farmer={farmer_id}")
        raw = analysis_engine.analyze_vegetation(boundaries)

        satellite_result = {
            "ndvi": raw.get("ndvi"),
            "ndwi": raw.get("ndwi"),
            "vegetation_health": raw.get("vegetation_health"),
            "drought_risk": raw.get("drought_risk"),
            "status": raw.get("status"),
        }

        satellite_payload = {
            "type": "satellite_imagery",
            "status": "success",
            "prediction_id": str(uuid.uuid4()),
            "result": raw,
            "metadata": {
                "timestamp": started_at,
                "farmer_id": farmer_id,
                "crop_type": crop_type,
                "agent": "CropWatchAgent",
                "session_id": session_id,
            },
        }

        sat_proof = send_to_node(satellite_payload)

        agent_log.append({
            "agent": "CropWatchAgent",
            "action": "satellite_analysis",
            "status": "success",
            "hedera_proof": sat_proof.get("proof"),
        })

        logger.info(f"[CropWatchAgent] Satellite analysis complete — health={satellite_result['vegetation_health']}")

    except Exception as e:
        logger.error(f"[CropWatchAgent] Satellite analysis failed: {e}")
        agent_log.append({
            "agent": "CropWatchAgent",
            "action": "satellite_analysis",
            "status": "failed",
            "error": str(e),
        })

    # AGENT 2: Advisory Agent — Disease Detection + Advice (if image provided)
    disease_result = None
    advisory_result = None

    if image_bytes and _pest_model and _class_dict:
        try:
            logger.info(f"[AdvisoryAgent] Running disease detection for farmer={farmer_id}")

            detection = run_detection(image_bytes, _pest_model, _class_dict)

            extra_context = None
            if satellite_result:
                extra_context = {
                    "ndvi_mean": satellite_result["ndvi"]["mean"] if satellite_result.get("ndvi") else None,
                    "drought_risk": satellite_result.get("drought_risk"),
                    "vegetation_health": satellite_result.get("vegetation_health"),
                }

            if not detection["is_non_plant"]:
                advice = await get_advice(
                    disease=detection["disease"],
                    crop=detection["crop"],
                    confidence=detection["confidence"],
                    farmer_id=farmer_id,
                    location_hint=location_hint,
                    detection_source="upload",
                    extra_context=extra_context,
                )

                disease_result = detection
                advisory_result = advice

                detect_payload = {
                    "type": "pest_detection",
                    "status": "success",
                    "prediction_id": str(uuid.uuid4()),
                    "result": {
                        "crop": detection["crop"],
                        "disease": detection["disease"],
                        "confidence": detection["confidence"],
                        "advice": advice["advice"],
                    },
                    "metadata": {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "farmer_id": farmer_id,
                        "agent": "AdvisoryAgent",
                        "session_id": session_id,
                    },
                }

                detect_proof = send_to_node(detect_payload)

                agent_log.append({
                    "agent": "AdvisoryAgent",
                    "action": "disease_detection_and_advice",
                    "status": "success",
                    "disease": detection["disease"],
                    "advice_source": advice["source"],
                    "hedera_proof": detect_proof.get("proof"),
                })

                logger.info(
                    f"[AdvisoryAgent] Disease={detection['disease']}, "
                    f"advice_source={advice['source']}"
                )

        except Exception as e:
            logger.error(f"[AdvisoryAgent] Failed: {e}")
            agent_log.append({
                "agent": "AdvisoryAgent",
                "action": "disease_detection_and_advice",
                "status": "failed",
                "error": str(e),
            })

    # Build unified farm report
    report = {
        "session_id": session_id,
        "farmer_id": farmer_id,
        "status": "success",
        "timestamp": started_at,
        "farm_summary": {
            "vegetation_health": satellite_result.get("vegetation_health") if satellite_result else "unknown",
            "drought_risk": satellite_result.get("drought_risk") if satellite_result else "unknown",
            "ndvi_mean": (
                satellite_result["ndvi"]["mean"]
                if satellite_result and satellite_result.get("ndvi")
                else None
            ),
            "disease_detected": (
                disease_result["disease"] if disease_result and not disease_result["is_non_plant"] else None
            ),
            "advice": advisory_result["advice"] if advisory_result else None,
        },
        "satellite_analysis": satellite_result,
        "disease_analysis": (
            {
                "crop": disease_result["crop"],
                "disease": disease_result["disease"],
                "confidence": disease_result["confidence"],
                "advice": advisory_result["advice"] if advisory_result else None,
                "advice_source": advisory_result["source"] if advisory_result else None,
            }
            if disease_result and not disease_result["is_non_plant"]
            else None
        ),
        "agent_log": agent_log,
    }

    logger.info(f"Orchestrator completed session={session_id} with {len(agent_log)} agent actions")
    return report