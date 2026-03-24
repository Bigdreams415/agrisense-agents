import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import FAILED_DIR, LOG_FILE
from models.loaders import (
    load_pest_model,
    load_class_indices,
    load_yield_model,
    load_irrigation_model,
)
from api.routes.predict_routes import router as predict_router, init_predict_router
from api.routes.satellite_routes import router as satellite_router
from api.routes.yield_routes import router as yield_router, init_yield_router
from api.routes.irrigation_routes import router as irrigation_router, init_irrigation_router
from api.routes.drone_routes import router as drone_router
from api.routes.agent_routes import router as agent_router
from agents.orchestrator import init_orchestrator
from hardware.mqtt_handler import start_mqtt
from hardware.ws_manager import ConnectionManager

os.makedirs(FAILED_DIR, exist_ok=True)

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pest_model = load_pest_model()
    class_dict = load_class_indices()
    yield_model, label_encoder = load_yield_model()
    irrigation_model, scaler, features = load_irrigation_model()

    init_predict_router(pest_model, class_dict)
    init_yield_router(yield_model, label_encoder)
    init_irrigation_router(irrigation_model, scaler, features)
    init_orchestrator(pest_model, class_dict)

    broker_type = os.getenv("BROKER_TYPE", "cloud")
    start_mqtt(manager, broker_type=broker_type)

    yield


app = FastAPI(
    title="AgriSense AI — Multi-Agent Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://agri-sense-ai-plum.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(satellite_router)
app.include_router(yield_router)
app.include_router(irrigation_router)
app.include_router(drone_router)
app.include_router(agent_router)


@app.get("/")
async def root():
    return {
        "message": "AgriSense AI Multi-Agent Backend",
        "version": "1.0.0",
        "status": "active",
        "agents": [
            "CropWatchAgent",
            "AdvisoryAgent",
            "InsuranceOracleAgent",
            "DataMarketplaceAgent",
        ],
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "message": "AgriSense AI backend is running",
        "version": "1.0.0",
    }