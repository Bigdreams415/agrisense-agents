import os
import json
import logging
import requests
import joblib

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
from tensorflow import keras
from azure.storage.blob import BlobServiceClient

from core.config import (
    CNN_AZURE_URL,
    YIELD_AZURE_URL,
    IRRIGATION_AZURE_URL,
    LABEL_ENCODER_AZURE_URL,
    LOCAL_MODEL_PATH,
    LOCAL_YIELD_MODEL_PATH,
    LOCAL_IRRIGATION_MODEL_PATH,
    LOCAL_LABEL_ENCODER_PATH,
    CLASS_INDICES_PATH,
    AZURE_STORAGE_CONNECTION_STRING,
)

tf.get_logger().setLevel("ERROR")
logger = logging.getLogger(__name__)

YIELD_FEATURES = [
    "Area", "Year", "average_rain_fall_mm_per_year", "pesticides_tonnes", "avg_temp",
    "rain_lag", "pest_temp_interact", "rain_pest_interact",
    "Item_1", "Item_2", "Item_3", "Item_4", "Item_5",
    "Item_6", "Item_7", "Item_8", "Item_9",
]

LOCAL_YIELD_BUNDLE_PATH = LOCAL_YIELD_MODEL_PATH
LOCAL_IRRIGATION_BUNDLE_PATH = LOCAL_IRRIGATION_MODEL_PATH


def _download_to_local(url: str, local_path: str, asset_name: str):
    if not url:
        raise RuntimeError(f"Missing URL for {asset_name}. Cannot download {asset_name}.")

    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    logger.info(f"Downloading {asset_name} from URL...")
    response = requests.get(url, stream=True, timeout=120)
    if response.status_code != 200:
        raise RuntimeError(f"Failed to download {asset_name}: HTTP {response.status_code}")

    with open(local_path, "wb") as out_file:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                out_file.write(chunk)

    logger.info(f"Saved {asset_name} to {local_path}")


def _get_blob_container():
    conn_str = AZURE_STORAGE_CONNECTION_STRING
    if not conn_str:
        return None
    blob_service = BlobServiceClient.from_connection_string(conn_str)
    return blob_service.get_container_client("models")


def load_pest_model():
    if not os.path.exists(LOCAL_MODEL_PATH):
        _download_to_local(CNN_AZURE_URL, LOCAL_MODEL_PATH, "pest model")

    model = keras.models.load_model(LOCAL_MODEL_PATH)
    logger.info("Pest detection model loaded.")
    return model


def load_class_indices():
    with open(CLASS_INDICES_PATH, "r") as f:
        class_indices = json.load(f)
    class_dict = {v: k for k, v in class_indices.items()}
    return class_dict


def load_yield_model():
    if os.path.exists(LOCAL_YIELD_BUNDLE_PATH) and os.path.exists(LOCAL_LABEL_ENCODER_PATH):
        logger.info("Loading yield model from local files...")
        yield_bundle = joblib.load(LOCAL_YIELD_BUNDLE_PATH)
        label_encoder = joblib.load(LOCAL_LABEL_ENCODER_PATH)
        logger.info("Yield model loaded.")
        return yield_bundle["model"], label_encoder

    if not os.path.exists(LOCAL_YIELD_BUNDLE_PATH):
        _download_to_local(YIELD_AZURE_URL, LOCAL_YIELD_BUNDLE_PATH, "yield model")

    if not os.path.exists(LOCAL_LABEL_ENCODER_PATH):
        _download_to_local(LABEL_ENCODER_AZURE_URL, LOCAL_LABEL_ENCODER_PATH, "label encoder")

    if os.path.exists(LOCAL_YIELD_BUNDLE_PATH) and os.path.exists(LOCAL_LABEL_ENCODER_PATH):
        logger.info("Loading yield model from local files after download...")
        yield_bundle = joblib.load(LOCAL_YIELD_BUNDLE_PATH)
        label_encoder = joblib.load(LOCAL_LABEL_ENCODER_PATH)
        logger.info("Yield model loaded.")
        return yield_bundle["model"], label_encoder

    container = _get_blob_container()
    if container and (not os.path.exists(LOCAL_YIELD_BUNDLE_PATH) or not os.path.exists(LOCAL_LABEL_ENCODER_PATH)):
        try:
            logger.info("Downloading yield model from Azure...")
            blob = container.download_blob("agrisense_0.63_yield_pred.pkl")
            with open(LOCAL_YIELD_BUNDLE_PATH, "wb") as out_file:
                out_file.write(blob.readall())

            logger.info("Downloading label encoder from Azure...")
            blob = container.download_blob("label_encoder.pkl")
            with open(LOCAL_LABEL_ENCODER_PATH, "wb") as out_file:
                out_file.write(blob.readall())
        except Exception as exc:
            logger.warning(f"Azure yield model download failed: {exc}")

    if not os.path.exists(LOCAL_YIELD_BUNDLE_PATH) or not os.path.exists(LOCAL_LABEL_ENCODER_PATH):
        raise RuntimeError("Yield model files are missing locally and could not be downloaded from URL or Azure Blob.")

    yield_bundle = joblib.load(LOCAL_YIELD_BUNDLE_PATH)
    label_encoder = joblib.load(LOCAL_LABEL_ENCODER_PATH)

    logger.info("Yield model loaded.")
    return yield_bundle["model"], label_encoder


def load_irrigation_model():
    if os.path.exists(LOCAL_IRRIGATION_BUNDLE_PATH):
        logger.info("Loading irrigation model from local file...")
        bundle = joblib.load(LOCAL_IRRIGATION_BUNDLE_PATH)
        logger.info("Irrigation model loaded.")
        return bundle["model"], bundle["scaler"], bundle["features"]

    if not os.path.exists(LOCAL_IRRIGATION_BUNDLE_PATH):
        _download_to_local(IRRIGATION_AZURE_URL, LOCAL_IRRIGATION_BUNDLE_PATH, "irrigation model")

    if os.path.exists(LOCAL_IRRIGATION_BUNDLE_PATH):
        logger.info("Loading irrigation model from local file after download...")
        bundle = joblib.load(LOCAL_IRRIGATION_BUNDLE_PATH)
        logger.info("Irrigation model loaded.")
        return bundle["model"], bundle["scaler"], bundle["features"]

    container = _get_blob_container()
    if container and not os.path.exists(LOCAL_IRRIGATION_BUNDLE_PATH):
        try:
            logger.info("Downloading irrigation model from Azure...")
            blob = container.download_blob("agrisense_irrigation_rf.pkl")
            with open(LOCAL_IRRIGATION_BUNDLE_PATH, "wb") as out_file:
                out_file.write(blob.readall())
        except Exception as exc:
            logger.warning(f"Azure irrigation model download failed: {exc}")

    if not os.path.exists(LOCAL_IRRIGATION_BUNDLE_PATH):
        raise RuntimeError("Irrigation model file is missing locally and could not be downloaded from URL or Azure Blob.")

    bundle = joblib.load(LOCAL_IRRIGATION_BUNDLE_PATH)

    logger.info("Irrigation model loaded.")
    return bundle["model"], bundle["scaler"], bundle["features"]