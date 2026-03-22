import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks

from agents.orchestrator import run_farm_analysis
from agents.insurance_oracle_agent import monitor_farm, run_oracle_loop, stop_oracle_loop
from core.schemas import AgentAnalyzeRequest

router = APIRouter(prefix="/agent", tags=["agents"])
logger = logging.getLogger(__name__)

_oracle_tasks: dict = {}


@router.post("/analyze")
async def agent_analyze(
    farmer_id: str = Form(...),
    boundaries: str = Form(...),
    crop_type: Optional[str] = Form(default=None),
    location_hint: Optional[str] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
):
    """
    Master orchestrator endpoint.
    Runs CropWatch (satellite) + Advisory (disease + Gemini) agents in one call.
    Pass an image file to also trigger disease detection.
    boundaries format: "[[min_lon,min_lat],[max_lon,max_lat]]"
    """
    try:
        import json
        parsed_boundaries = json.loads(boundaries)

        image_bytes = None
        if image:
            image_bytes = await image.read()

        report = await run_farm_analysis(
            farmer_id=farmer_id,
            boundaries=parsed_boundaries,
            image_bytes=image_bytes,
            crop_type=crop_type,
            location_hint=location_hint,
        )
        return report

    except Exception as e:
        logger.error(f"Agent analyze failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent analysis failed: {str(e)}")


@router.post("/oracle/start")
async def start_oracle(
    farmer_id: str = Form(...),
    boundaries: str = Form(...),
    crop_type: Optional[str] = Form(default=None),
    interval_hours: float = Form(default=6.0),
    background_tasks: BackgroundTasks = None,
):
    """
    Starts the Insurance Oracle Agent autonomous loop for a farm.
    The agent will monitor satellite data every interval_hours
    and autonomously trigger insurance claims when conditions are met.
    """
    try:
        import json
        parsed_boundaries = json.loads(boundaries)

        if farmer_id in _oracle_tasks:
            return {
                "status": "already_running",
                "farmer_id": farmer_id,
                "message": f"Oracle loop already active for farmer {farmer_id}",
            }

        task = asyncio.create_task(
            run_oracle_loop(
                farmer_id=farmer_id,
                boundaries=parsed_boundaries,
                crop_type=crop_type,
                interval_hours=interval_hours,
            )
        )
        _oracle_tasks[farmer_id] = task

        logger.info(f"Insurance Oracle loop started for farmer={farmer_id}")

        return {
            "status": "started",
            "farmer_id": farmer_id,
            "interval_hours": interval_hours,
            "message": (
                f"InsuranceOracleAgent is now autonomously monitoring farm {farmer_id} "
                f"every {interval_hours} hours. "
                "Payouts will trigger automatically when NDVI < 20%, "
                "vegetation is poor, and drought risk is high or severe."
            ),
        }

    except Exception as e:
        logger.error(f"Oracle start failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start oracle: {str(e)}")


@router.post("/oracle/stop/{farmer_id}")
async def stop_oracle(farmer_id: str):
    """
    Stops the Insurance Oracle Agent loop for a specific farmer.
    """
    if farmer_id not in _oracle_tasks:
        raise HTTPException(
            status_code=404,
            detail=f"No active oracle loop found for farmer {farmer_id}",
        )

    task = _oracle_tasks.pop(farmer_id)
    task.cancel()
    stop_oracle_loop()

    return {
        "status": "stopped",
        "farmer_id": farmer_id,
        "message": f"InsuranceOracleAgent loop stopped for farmer {farmer_id}",
    }


@router.post("/oracle/check")
async def oracle_check_once(
    farmer_id: str = Form(...),
    boundaries: str = Form(...),
    crop_type: Optional[str] = Form(default=None),
):
    """
    Runs a single Insurance Oracle check without starting the loop.
    Good for on-demand insurance evaluation and demos.
    """
    try:
        import json
        parsed_boundaries = json.loads(boundaries)

        result = await monitor_farm(
            farmer_id=farmer_id,
            boundaries=parsed_boundaries,
            crop_type=crop_type,
        )
        return result

    except Exception as e:
        logger.error(f"Oracle check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Oracle check failed: {str(e)}")


@router.get("/oracle/status")
async def oracle_status():
    """
    Returns which farmer oracle loops are currently active.
    """
    return {
        "active_oracles": list(_oracle_tasks.keys()),
        "count": len(_oracle_tasks),
    }


@router.get("/status")
async def agent_status():
    """
    Returns status of all agents in the system.
    Useful for the demo and for judges to see the agent layer.
    """
    return {
        "agents": [
            {
                "name": "CropWatchAgent",
                "type": "reactive + autonomous",
                "description": "Monitors crop health via satellite NDVI/NDWI analysis",
                "status": "active",
                "hedera_integration": "HCS topic logging per analysis",
            },
            {
                "name": "AdvisoryAgent",
                "type": "reactive",
                "description": "Generates Gemini-powered contextual farm advice from disease detections",
                "status": "active",
                "hedera_integration": "HCS topic logging per advice",
            },
            {
                "name": "InsuranceOracleAgent",
                "type": "autonomous",
                "description": "Autonomously monitors NDVI and triggers insurance payouts via smart contract",
                "status": "active" if _oracle_tasks else "idle",
                "active_farm_loops": list(_oracle_tasks.keys()),
                "hedera_integration": "HCS logging + HSCS contract execution",
            },
            {
                "name": "DataMarketplaceAgent",
                "type": "reactive",
                "description": "Manages ASAI token rewards and NFT minting for data contributions",
                "status": "active",
                "hedera_integration": "HTS token transfers + NFT minting via HCS logs",
            },
        ],
        "total_active_oracle_loops": len(_oracle_tasks),
    }