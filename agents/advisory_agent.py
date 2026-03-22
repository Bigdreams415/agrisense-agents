import os
import json
import logging
from typing import Optional
from google import genai
from google.genai import types

from core.config import GEMINI_API_KEY, DISEASE_INFO_PATH

logger = logging.getLogger(__name__)

with open(DISEASE_INFO_PATH, "r") as f:
    _fallback_advice = json.load(f)

_client = genai.Client(api_key=GEMINI_API_KEY)


def _build_prompt(
    disease: str,
    crop: str,
    confidence: float,
    location_hint: Optional[str],
    detection_source: str,
    extra_context: Optional[dict],
) -> str:
    confidence_pct = round(confidence * 100, 1)
    context_lines = []

    if location_hint:
        context_lines.append(f"- Farm location: {location_hint}")
    if extra_context:
        if extra_context.get("ndvi_mean") is not None:
            context_lines.append(f"- Current NDVI: {round(extra_context['ndvi_mean'], 3)}")
        if extra_context.get("drought_risk"):
            context_lines.append(f"- Drought risk level: {extra_context['drought_risk']}")
        if extra_context.get("vegetation_health"):
            context_lines.append(f"- Vegetation health: {extra_context['vegetation_health']}")
        if extra_context.get("soil_moisture") is not None:
            context_lines.append(f"- Soil moisture: {extra_context['soil_moisture']}")
        if extra_context.get("temperature") is not None:
            context_lines.append(f"- Temperature: {extra_context['temperature']}°C")

    context_block = (
        "\n".join(context_lines) if context_lines else "- No additional farm context available"
    )
    source_note = (
        "drone aerial imagery" if detection_source == "drone"
        else "yield prediction model" if detection_source == "yield_model"
        else "irrigation sensor model" if detection_source == "irrigation_model"
        else "direct leaf image upload"
    )

    return f"""You are AgriSense AI, an expert agricultural advisory agent helping smallholder farmers in Africa and developing regions.

A crop disease has been detected. Reason over the farm data and produce a specific, actionable advisory report.

DETECTION DETAILS:
- Crop: {crop}
- Disease detected: {disease}
- Detection confidence: {confidence_pct}%
- Analysis type: {detection_source.replace('_', ' ').title()}
- Detection method: {source_note}

FARM CONTEXT:
{context_block}

INSTRUCTIONS:
1. Acknowledge the detection and what it means for the crop in 1-2 sentences.
2. Explain the likely cause and spread conditions briefly (2-3 sentences).
3. Give 3-5 concrete treatment and containment steps ranked by urgency. Name actual products, quantities, or techniques where possible.
4. Give 1-2 preventive steps to protect adjacent crops or the next season.
5. If confidence is below 60%, add a caution that physical inspection is recommended.
6. Keep total response under 300 words. Use plain language suitable for a farmer, not a scientist.
7. Use numbered lists only. No bullet symbols.
8. Do not add preamble like "Sure!" or "Certainly!". Start directly with the advisory.

Respond in English only."""


async def get_advice(
    disease: str,
    crop: str,
    confidence: float,
    farmer_id: Optional[str] = None,
    location_hint: Optional[str] = None,
    detection_source: str = "upload",
    extra_context: Optional[dict] = None,
) -> dict:
    """
    Calls Gemini to generate dynamic context-aware farm advice.
    Falls back to disease_info.json if Gemini fails.
    """
    try:
        prompt = _build_prompt(
            disease=disease,
            crop=crop,
            confidence=confidence,
            location_hint=location_hint,
            detection_source=detection_source,
            extra_context=extra_context,
        )

        response = await _client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1000,
                temperature=0.4,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0,
                ),
            ),
        )

        advice_text = response.text.strip()
        finish_reason = response.candidates[0].finish_reason
        logger.info(f"Advisory agent generated Gemini advice — disease={disease}, farmer={farmer_id}")

        return {
            "advice": advice_text,
            "source": "gemini",
            "disease": disease,
            "crop": crop,
        }

    except Exception as e:
        logger.warning(f"Gemini advisory failed for {disease}: {e}. Using fallback.")
        return _get_fallback_advice(disease, crop)


def _get_fallback_advice(disease: str, crop: str) -> dict:
    raw_label = f"{crop}___{disease}".replace(" ", "_")
    match = _fallback_advice.get(raw_label)

    if not match:
        for key, val in _fallback_advice.items():
            if val.get("disease", "").lower() == disease.lower():
                match = val
                break

    if match:
        return {
            "advice": match.get("advice", "No advice available for this disease."),
            "source": "fallback",
            "disease": disease,
            "crop": crop,
        }

    return {
        "advice": (
            f"{disease} detected on your {crop} crop. "
            "Please consult your local agricultural extension officer immediately "
            "for treatment recommendations specific to your region."
        ),
        "source": "fallback",
        "disease": disease,
        "crop": crop,
    }