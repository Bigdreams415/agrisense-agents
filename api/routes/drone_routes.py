import uuid
import base64
import logging
import asyncio
import subprocess
import os
from datetime import datetime
from io import BytesIO
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect

from core.schemas import DroneConnectRequest, JobCreateRequest

BACKEND_URL = (os.getenv("BACKEND_URL") or "http://localhost:8000").rstrip("/")
WS_BASE_URL = (
    os.getenv("WS_BASE_URL")
    or BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")
).rstrip("/")

router = APIRouter()
logger = logging.getLogger(__name__)

drones: dict = {}
jobs: dict = {}
frame_history: dict = {}


@router.post("/api/drones/connect")
async def connect_drone(request: DroneConnectRequest):
    drone_id = str(uuid.uuid4())

    try:
        if request.method == "rtsp":
            cmd = [
                "ffmpeg", "-timeout", "8000000",
                "-rtsp_transport", "tcp",
                "-i", request.url,
                "-t", "2", "-frames", "1",
                "-f", "null", "-",
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=10, text=True)
            if result.returncode != 0:
                raise ValueError("RTSP connection failed")

        elif request.method == "rtmp":
            pass
        else:
            raise ValueError("Invalid method. Use rtsp or rtmp.")

        drones[drone_id] = {
            "method": request.method,
            "url": request.url,
            "status": "connected",
            "connected_at": datetime.now().isoformat(),
        }
        return {"drone_id": drone_id, "status": "connected"}

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=400, detail="RTSP connection timeout")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/jobs")
async def create_job(request: JobCreateRequest, background_tasks: BackgroundTasks):
    if request.drone_id not in drones:
        raise HTTPException(status_code=404, detail="Drone not found")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "drone_id": request.drone_id,
        "interval_s": request.interval_s,
        "farmer_id": request.farmer_id,
        "active": True,
        "ws_clients": [],
        "last_frame_ts": None,
        "created_at": datetime.now().isoformat(),
    }

    background_tasks.add_task(start_frame_loop, job_id)
    ws_url = f"{WS_BASE_URL}/ws/jobs/{job_id}"
    return {"job_id": job_id, "ws_url": ws_url, "status": "started"}


async def start_frame_loop(job_id: str):
    if job_id not in jobs:
        return

    job = jobs[job_id]
    drone = drones[job["drone_id"]]
    url = drone["url"]
    method = drone["method"]

    frame_count = 0
    consecutive_failures = 0
    max_failures = 5

    while job["active"]:
        try:
            frame_count += 1
            timestamp = datetime.now().isoformat()
            frame_id = f"{job_id}-frame-{frame_count}"

            cmd = (
                [
                    "ffmpeg", "-y", "-rtsp_transport", "tcp",
                    "-i", url, "-frames:v", "1", "-qscale:v", "5",
                    "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
                ]
                if method == "rtsp"
                else [
                    "ffmpeg", "-y", "-i", url, "-frames:v", "1",
                    "-qscale:v", "5", "-f", "image2pipe",
                    "-vcodec", "mjpeg", "pipe:1",
                ]
            )

            result = subprocess.run(cmd, capture_output=True, timeout=15)

            if result.returncode == 0 and len(result.stdout) > 5000:
                frame_bytes = result.stdout
                consecutive_failures = 0

                frame_file = BytesIO(frame_bytes)
                frame_file.name = f"{frame_id}.jpg"

                ml_response = await _call_predict(frame_file, job["drone_id"], job_id, timestamp)
                thumbnail_b64 = base64.b64encode(frame_bytes).decode("utf-8")

                if not job["active"]:
                    break

                frame_history[frame_id] = {
                    **ml_response,
                    "timestamp": timestamp,
                    "thumbnail_b64": thumbnail_b64,
                }

                for client in job["ws_clients"][:]:
                    try:
                        await client.send_json({
                            "type": "frame_result",
                            "frame_id": frame_id,
                            "detections": ml_response.get("detections", []),
                            "confidence": ml_response.get("confidence", 0.0),
                            "advice": ml_response.get("advice", ""),
                            "timestamp": timestamp,
                            "thumbnail_b64": thumbnail_b64,
                            "prediction_id": ml_response.get("prediction_id"),
                            "blockchain_proof": ml_response.get("hedera_proof"),
                        })
                    except Exception:
                        job["ws_clients"].remove(client)

                job["last_frame_ts"] = timestamp

            else:
                consecutive_failures += 1
                if consecutive_failures >= max_failures:
                    job["active"] = False
                    break

        except subprocess.TimeoutExpired:
            consecutive_failures += 1
            if consecutive_failures >= max_failures:
                job["active"] = False
                break
        except Exception as e:
            logger.error(f"Frame loop error: {e}")
            consecutive_failures += 1
            if consecutive_failures >= max_failures:
                job["active"] = False
                break

        if job["active"]:
            await asyncio.sleep(job["interval_s"])


async def _call_predict(frame_file: BytesIO, drone_id: str, job_id: str, timestamp: str) -> dict:
    try:
        job = jobs.get(job_id, {})
        farmer_id = job.get("farmer_id")

        frame_file.seek(0)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BACKEND_URL}/predict",
                files={"file": ("drone_frame.jpg", frame_file, "image/jpeg")},
                data={"farmer_id": farmer_id},
                timeout=30.0,
            )

        if response.status_code == 200:
            ml = response.json()
            return {
                "status": ml.get("status"),
                "prediction_id": ml.get("prediction_id"),
                "type": ml.get("type"),
                "result": ml.get("result"),
                "metadata": ml.get("metadata"),
                "alternative": ml.get("alternative"),
                "hedera_proof": ml.get("hedera_proof"),
                "reward_status": ml.get("reward_status"),
                "bonus_status": ml.get("bonus_status"),
                "nft": ml.get("nft"),
                "detections": [ml["result"]["disease"]],
                "confidence": ml["result"]["confidence"],
                "advice": ml["result"]["advice"],
            }
        else:
            return {
                "status": "error",
                "detections": ["ml_service_error"],
                "confidence": 0.0,
                "advice": "ML service unavailable",
            }

    except Exception as e:
        logger.error(f"Drone predict call failed: {e}")
        return {
            "status": "error",
            "detections": ["connection_error"],
            "confidence": 0.0,
            "advice": "Connection to ML service failed",
        }


@router.websocket("/ws/jobs/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()

    if job_id not in jobs:
        await websocket.close(code=1008, reason="Job not found")
        return

    jobs[job_id]["ws_clients"].append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if job_id in jobs and websocket in jobs[job_id]["ws_clients"]:
            jobs[job_id]["ws_clients"].remove(websocket)
    except Exception:
        if job_id in jobs and websocket in jobs[job_id]["ws_clients"]:
            jobs[job_id]["ws_clients"].remove(websocket)


@router.post("/api/jobs/{job_id}/stop")
async def stop_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    jobs[job_id]["active"] = False
    for client in jobs[job_id]["ws_clients"][:]:
        try:
            await client.close()
        except Exception:
            pass
    jobs[job_id]["ws_clients"] = []
    return {"status": "stopped", "job_id": job_id}


@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    if job_id in jobs:
        jobs[job_id]["active"] = False
        for client in jobs[job_id]["ws_clients"][:]:
            try:
                await client.close()
            except Exception:
                pass
        del jobs[job_id]
    return {"status": "deleted", "job_id": job_id}