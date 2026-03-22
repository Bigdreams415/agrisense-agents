from pydantic import BaseModel, field_validator
from typing import List, Optional, Union
from datetime import datetime


class AnalysisRequest(BaseModel):
    farmer_id: Optional[str] = None
    boundaries: Union[List[List[float]], List[float]]
    crop_type: Optional[str] = None
    planting_date: Optional[str] = None

    @field_validator("boundaries")
    def validate_boundaries(cls, v):
        if isinstance(v, list) and len(v) == 4 and all(isinstance(x, (int, float)) for x in v):
            v = [[float(v[0]), float(v[1])], [float(v[2]), float(v[3])]]

        if not v or len(v) != 2:
            raise ValueError(
                "Boundaries must contain exactly 2 coordinate pairs: "
                "[[min_lon, min_lat], [max_lon, max_lat]]"
            )

        for coord_pair in v:
            if len(coord_pair) != 2:
                raise ValueError("Each coordinate pair must contain exactly 2 values.")
            lon, lat = float(coord_pair[0]), float(coord_pair[1])
            if not (-180 <= lon <= 180):
                raise ValueError("Longitude must be between -180 and 180")
            if not (-90 <= lat <= 90):
                raise ValueError("Latitude must be between -90 and 90")

        min_lon, min_lat = v[0]
        max_lon, max_lat = v[1]
        if min_lon >= max_lon:
            raise ValueError("min_lon must be less than max_lon")
        if min_lat >= max_lat:
            raise ValueError("min_lat must be less than max_lat")

        return v

    @field_validator("planting_date")
    def validate_planting_date(cls, v):
        if v is None:
            return v
        normalized = v.replace("/", "-")
        try:
            datetime.strptime(normalized, "%Y-%m-%d")
            return normalized
        except ValueError:
            parts = normalized.split("-")
            if len(parts) == 3 and len(parts[0]) == 2:
                normalized = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                datetime.strptime(normalized, "%Y-%m-%d")
                return normalized
            raise ValueError("planting_date must be YYYY-MM-DD or MM-DD-YYYY")


class YieldRequest(BaseModel):
    Area: str
    Year: int
    avg_temp: float
    average_rain_fall_mm_per_year: float
    pesticides_tonnes: float
    crop_type: str
    farmer_id: Optional[str] = None


class IrrigationRequest(BaseModel):
    soil_moisture: float
    temperature: float
    air_humidity: float
    farmer_id: Optional[str] = None


class DroneConnectRequest(BaseModel):
    method: str
    url: str


class JobCreateRequest(BaseModel):
    drone_id: str
    interval_s: int
    farmer_id: Optional[str] = None


class AgentAnalyzeRequest(BaseModel):
    farmer_id: str
    boundaries: Union[List[List[float]], List[float]]
    crop_type: Optional[str] = None
    location_hint: Optional[str] = None