import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Union, List

from satellite_analysis.services.analysis_engine import analysis_engine
from core.hcs_logger import send_to_node

logger = logging.getLogger(__name__)

_running = False


def _should_trigger_claim(ndvi_mean: float, vegetation_health: str, drought_risk: str) -> bool:
    """
    Mirrors the exact same logic in logger.js shouldProcessInsuranceClaim()
    so both layers agree on when a claim should fire.
    """
    ndvi_pct = round(ndvi_mean * 100)
    is_poor = vegetation_health.lower() == "poor"
    is_low_ndvi = ndvi_pct < 20
    is_drought = drought_risk.lower() in ["high", "severe"]

    logger.info(
        f"[InsuranceOracleAgent] Eligibility check — "
        f"ndvi_pct={ndvi_pct}, poor={is_poor}, low_ndvi={is_low_ndvi}, drought={is_drought}"
    )
    return is_poor and is_low_ndvi and is_drought


async def monitor_farm(
    farmer_id: str,
    boundaries: Union[List[List[float]], List[float]],
    crop_type: str = None,
    session_id: str = None,
) -> dict:
    """
    Insurance Oracle Agent — one monitoring cycle for a single farm.

    Pulls NDVI/NDWI via satellite, evaluates claim conditions,
    and sends to Node.js which handles the actual smart contract call.
    The agent decision itself is logged to HCS regardless of outcome.
    """
    session_id = session_id or str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    logger.info(f"[InsuranceOracleAgent] Monitoring farm={farmer_id}, session={session_id}")

    try:
        raw = analysis_engine.analyze_vegetation(boundaries)

        ndvi_mean = raw.get("ndvi", {}).get("mean", 0.0)
        vegetation_health = raw.get("vegetation_health", "unknown")
        drought_risk = raw.get("drought_risk", "unknown")

        should_claim = _should_trigger_claim(ndvi_mean, vegetation_health, drought_risk)

        payload = {
            "type": "satellite_imagery",
            "status": "success",
            "prediction_id": str(uuid.uuid4()),
            "result": raw,
            "metadata": {
                "timestamp": timestamp,
                "farmer_id": farmer_id,
                "crop_type": crop_type,
                "agent": "InsuranceOracleAgent",
                "session_id": session_id,
                "oracle_decision": {
                    "should_trigger_claim": should_claim,
                    "ndvi_mean": ndvi_mean,
                    "vegetation_health": vegetation_health,
                    "drought_risk": drought_risk,
                },
            },
        }

        proof_response = send_to_node(payload)

        insurance_result = proof_response.get("insuranceProcessing", {})

        logger.info(
            f"[InsuranceOracleAgent] Decision logged — "
            f"should_claim={should_claim}, "
            f"scenario={insurance_result.get('scenario', 'unknown')}, "
            f"farmer={farmer_id}"
        )

        return {
            "agent": "InsuranceOracleAgent",
            "session_id": session_id,
            "farmer_id": farmer_id,
            "timestamp": timestamp,
            "oracle_decision": {
                "should_trigger_claim": should_claim,
                "ndvi_mean": ndvi_mean,
                "vegetation_health": vegetation_health,
                "drought_risk": drought_risk,
            },
            "insurance_outcome": insurance_result,
            "hedera_proof": proof_response.get("proof"),
            "status": "success",
        }

    except Exception as e:
        logger.error(f"[InsuranceOracleAgent] Failed for farmer={farmer_id}: {e}")
        return {
            "agent": "InsuranceOracleAgent",
            "session_id": session_id,
            "farmer_id": farmer_id,
            "timestamp": timestamp,
            "status": "failed",
            "error": str(e),
        }


async def run_oracle_loop(
    farmer_id: str,
    boundaries: Union[List[List[float]], List[float]],
    crop_type: str = None,
    interval_hours: float = 6.0,
):
    """
    Autonomous background loop — monitors a farm every interval_hours.
    Runs until the server shuts down or the loop is cancelled.
    """
    global _running
    _running = True
    interval_seconds = interval_hours * 3600

    logger.info(
        f"[InsuranceOracleAgent] Starting autonomous loop — "
        f"farmer={farmer_id}, interval={interval_hours}h"
    )

    while _running:
        await monitor_farm(
            farmer_id=farmer_id,
            boundaries=boundaries,
            crop_type=crop_type,
        )
        logger.info(
            f"[InsuranceOracleAgent] Cycle complete. "
            f"Next check in {interval_hours}h for farmer={farmer_id}"
        )
        await asyncio.sleep(interval_seconds)


def stop_oracle_loop():
    global _running
    _running = False
    logger.info("[InsuranceOracleAgent] Loop stopped.")