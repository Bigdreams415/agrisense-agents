import time
import numpy as np
import shutil
import rasterio
import os
from datetime import datetime, timedelta 
from typing import Union, List, Optional
from satellite_analysis.services.nasa_client import nasa_client

class AnalysisEngine:
    """
    Handles satellite imagery analysis and processing
    """
    
    def __init__(self):
        self.nasa = nasa_client

    def _validate_and_normalize_boundaries(self, boundaries: Union[List[float], List[List[float]]]) -> List[float]:
        """
        Validate boundaries and convert to flat list format expected by earthaccess
        """
        if isinstance(boundaries[0], list):
            if len(boundaries) == 2 and len(boundaries[0]) == 2 and len(boundaries[1]) == 2:
                return [boundaries[0][0], boundaries[0][1], boundaries[1][0], boundaries[1][1]]
            elif len(boundaries) == 4 and all(len(coord) == 2 for coord in boundaries):
                lons = [coord[0] for coord in boundaries]
                lats = [coord[1] for coord in boundaries]
                return [min(lons), min(lats), max(lons), max(lats)]
            else:
                raise ValueError("Invalid nested boundaries format. Expected [[min_lon, min_lat], [max_lon, max_lat]] or polygon with 4 points")
        
        elif isinstance(boundaries[0], (int, float)):
            if len(boundaries) != 4:
                raise ValueError("Flat boundaries must contain exactly 4 coordinates: [min_lon, min_lat, max_lon, max_lat]")
            return boundaries
        
        else:
            raise ValueError("Invalid boundaries format. Must be list of numbers or list of coordinate pairs")

    def _extract_band_from_files(self, file_paths: List[str], band_name: str, qa_file_path: Optional[str] = None):
        """
        Extract a specific band from downloaded HLS files
        """
        band_file = next((f for f in file_paths if band_name in os.path.basename(f)), None)
        if not band_file:
            raise ValueError(f"Band file for {band_name} not found in {[os.path.basename(f) for f in file_paths]}")
        
        with rasterio.open(band_file) as src:
            band_data = src.read(1).astype(float) * 0.0001   
        
        if qa_file_path:
            with rasterio.open(qa_file_path) as qa_src:
                qa_data = qa_src.read(1)
                cloud_mask = (
                    ((qa_data & (1 << 5)) > 0) |  
                    ((qa_data & (1 << 3)) > 0) |  
                    ((qa_data & (1 << 4)) > 0) |   
                    ((qa_data & (1 << 2)) > 0) |   
                    ((qa_data & (1 << 6)) > 0)    
                )
                band_data = np.where(~cloud_mask, band_data, np.nan)
                print(f"Masked {np.sum(cloud_mask)} pixels as invalid for {band_name}")
        
        band_data = np.clip(band_data, 0, 1)
        
        print(f"{band_name} range after processing: {np.nanmin(band_data):.3f} to {np.nanmax(band_data):.3f}")
        return band_data

    def analyze_vegetation(self, boundaries: Union[List[float], List[List[float]]]):
        """
        Complete vegetation analysis with NDVI and NDWI
        """
        try:
            print(f"Starting analysis for boundaries: {boundaries}")
            normalized_boundaries = self._validate_and_normalize_boundaries(boundaries)

            print("Fetching HLS data for analysis...")
            all_files = self.nasa.fetch_imagery(normalized_boundaries, time_range_days=60)
            print(f"Available files: {[os.path.basename(f) for f in all_files]}")

            qa_file = next((f for f in all_files if 'Fmask' in os.path.basename(f)), None)
            if not qa_file:
                print("Warning: No Fmask file found; skipping cloud masking")
                qa_file = None
            
            red = self._extract_band_from_files(all_files, 'B04', qa_file)
            nir = self._extract_band_from_files(all_files, 'B08', qa_file)
            ndvi = np.clip((nir - red) / (nir + red + 1e-6), -1, 1)   
            
            print(f"NDVI range: {np.nanmin(ndvi):.3f} to {np.nanmax(ndvi):.3f}")
            
            #NDWI: B03 
            green = self._extract_band_from_files(all_files, 'B03', qa_file)
            ndwi = np.clip((green - nir) / (green + nir + 1e-6), -1, 1)  
            
            print(f"NDWI range: {np.nanmin(ndwi):.3f} to {np.nanmax(ndwi):.3f}")
            
            analysis_result = {
                "timestamp": datetime.now().isoformat(),
                "boundaries": boundaries,
                "ndvi": {
                    "mean": float(np.nanmean(ndvi)),
                    "min": float(np.nanmin(ndvi)),
                    "max": float(np.nanmax(ndvi)),
                    "std": float(np.nanstd(ndvi))
                },
                "ndwi": {
                    "mean": float(np.nanmean(ndwi)),
                    "min": float(np.nanmin(ndwi)),
                    "max": float(np.nanmax(ndwi)),
                    "std": float(np.nanstd(ndwi))
                },
                "vegetation_health": self._assess_health(ndvi),
                "drought_risk": self._assess_drought(ndvi, ndwi),
                "status": "success"
            }
            
            print("Analysis completed successfully!")
            if os.path.exists('nasa_data'):
                shutil.rmtree('nasa_data')
                print("Cleaned up nasa_data folder")
            return analysis_result
            
        except Exception as e:
            print(f"Analysis failed: {str(e)}")
            error_result = {
                "timestamp": datetime.now().isoformat(),
                "boundaries": boundaries,
                "ndvi": {
                    "mean": 0.0,
                    "min": 0.0,
                    "max": 0.0,
                    "std": 0.0
                },
                "ndwi": {
                    "mean": 0.0,
                    "min": 0.0,
                    "max": 0.0,
                    "std": 0.0
                },
                "vegetation_health": "unknown",
                "drought_risk": "unknown",
                "status": "error",
                "error": str(e)
            }
            return error_result

    def _assess_health(self, ndvi_array: np.ndarray) -> str:
        """Assess vegetation health based on NDVI"""
        mean_ndvi = np.nanmean(ndvi_array)
        
        if mean_ndvi > 0.6:
            return "excellent"
        elif mean_ndvi > 0.4:
            return "good"
        elif mean_ndvi > 0.2:
            return "moderate"
        else:
            return "poor"

    def _assess_drought(self, ndvi_array: np.ndarray, ndwi_array: np.ndarray) -> str:
        """Assess drought risk based on NDVI and NDWI"""
        mean_ndvi = np.nanmean(ndvi_array)
        mean_ndwi = np.nanmean(ndwi_array)
        
        if mean_ndvi < 0.2 and mean_ndwi < 0.0:
            return "severe"
        elif mean_ndvi < 0.3 and mean_ndwi < 0.1:
            return "high"
        elif mean_ndvi < 0.4 and mean_ndwi < 0.2:
            return "moderate"
        else:
            return "low"

# Singleton instance
analysis_engine = AnalysisEngine()