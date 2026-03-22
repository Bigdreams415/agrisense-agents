import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
HASGRAPH_URL = os.getenv("HASGRAPH_URL", "http://localhost:4000/log")
EARTHDATA_USERNAME = os.getenv("EARTHDATA_USERNAME")
EARTHDATA_PASSWORD = os.getenv("EARTHDATA_PASSWORD")
BROKER_TYPE = os.getenv("BROKER_TYPE", "cloud")

CNN_AZURE_URL = os.getenv("CNN_AZURE_URL") or os.getenv("AZURE_MODEL_URL")
YIELD_AZURE_URL = os.getenv("YIELD_AZURE_URL")
IRRIGATION_AZURE_URL = os.getenv("IRRIGATION_AZURE_URL")
LABEL_ENCODER_AZURE_URL = os.getenv("LABEL_ENCODER_AZURE_URL")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_MODEL_PATH = os.path.join(BASE_DIR, "models", "finetuned_pest_detection_final.keras")
LOCAL_YIELD_MODEL_PATH = os.path.join(BASE_DIR, "models", "agrisense_0.63_yield_pred.pkl")
LOCAL_IRRIGATION_MODEL_PATH = os.path.join(BASE_DIR, "models", "agrisense_irrigation_rf.pkl")
LOCAL_LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "models", "label_encoder.pkl")
CLASS_INDICES_PATH = os.path.join(BASE_DIR, "models", "class_indices.json")
DISEASE_INFO_PATH = os.path.join(BASE_DIR, "models", "disease_info.json")
LOG_FILE = os.path.join(BASE_DIR, "predictions.log")
FAILED_DIR = os.path.join(BASE_DIR, "failed_logs")