import numpy as np
from PIL import Image
from io import BytesIO


def run_detection(
    image_bytes: bytes,
    model,
    class_dict: dict,
    confidence_threshold: float = 0.6,
) -> dict:
    """
    Runs CNN inference on raw image bytes.
    Returns structured detection result for use by agents.
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    resized = image.resize((224, 224))
    img_array = np.expand_dims(np.asarray(resized), axis=0) / 255.0

    predictions = model.predict(img_array)
    probs = predictions[0].tolist()

    top_indices = np.argsort(probs)[::-1][:3]
    main_idx = top_indices[0]
    main_label = class_dict[main_idx]
    top_conf = probs[main_idx]

    is_non_plant = (main_label.lower() == "non-plant") or (top_conf < confidence_threshold)

    if is_non_plant:
        return {
            "is_non_plant": True,
            "label": main_label,
            "disease": "Non-plant object",
            "crop": "Non-plant",
            "confidence": top_conf,
            "alternatives": [],
        }

    parts = main_label.split("___")
    crop = parts[0].replace("_", " ") if len(parts) > 1 else "Unknown"
    disease = parts[1].replace("_", " ") if len(parts) > 1 else main_label.replace("_", " ")

    alternatives = [
        {
            "label": class_dict[idx],
            "confidence": probs[idx],
        }
        for idx in top_indices[1:]
    ]

    return {
        "is_non_plant": False,
        "label": main_label,
        "disease": disease,
        "crop": crop,
        "confidence": top_conf,
        "alternatives": alternatives,
    }