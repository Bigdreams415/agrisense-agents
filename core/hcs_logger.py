import os
import json
import uuid
import time
import logging
import requests

from core.config import HASGRAPH_URL, FAILED_DIR

logger = logging.getLogger(__name__)
os.makedirs(FAILED_DIR, exist_ok=True)


def _fallback_save(prediction_id: str, payload: dict):
    try:
        path = os.path.join(FAILED_DIR, f"{prediction_id}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        logger.warning(f"Saved failed log to {path}")
    except Exception as e:
        logger.error(f"Failed to write failed log to disk: {e}")


def send_to_node(payload: dict, node_url: str = None) -> dict:
    """
    Sends inference result to Node.js Hedera logger.
    Retries up to 3 times on network errors only.
    """
    if node_url is None:
        node_url = HASGRAPH_URL

    max_attempts = 3
    backoff = 1
    prediction_id = payload.get("prediction_id", str(uuid.uuid4()))

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Sending to Node.js (attempt {attempt}) — prediction_id: {prediction_id}")
            resp = requests.post(node_url, json=payload, timeout=20)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "ok":
                    logger.info(f"Node.js logged successfully on attempt {attempt}")
                    return data
                else:
                    logger.warning(f"Node.js returned error: {data.get('message')}")
                    return data

            elif resp.status_code >= 500:
                logger.warning(f"Server error on attempt {attempt}: {resp.status_code}")
            else:
                return {"status": "error", "proof": None}

        except requests.RequestException as exc:
            logger.warning(f"Network error on attempt {attempt}: {exc}")

        if attempt < max_attempts:
            time.sleep(backoff)
            backoff *= 2

    logger.error(f"All Node.js log attempts failed for {prediction_id}")
    _fallback_save(prediction_id, payload)
    return {"status": "error", "proof": None}