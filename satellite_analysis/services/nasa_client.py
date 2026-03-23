import os
from dotenv import load_dotenv
import earthaccess
from typing import List
from datetime import datetime, timedelta

load_dotenv()

class NasaClient:
    """
    Handles authentication and communication with NASA's Earthdata using earthaccess for HLS data
    """
    
    def __init__(self):
        self.username = os.getenv("EARTHDATA_USERNAME")
        self.password = os.getenv("EARTHDATA_PASSWORD")
        if not self.username or not self.password:
            raise ValueError("EARTHDATA_USERNAME and EARTHDATA_PASSWORD must be set in .env")
        # earthaccess reads EARTHDATA_* vars from environment in recent versions.
        earthaccess.login(strategy="environment")
        self.download_folder = "nasa_data"
        os.makedirs(self.download_folder, exist_ok=True)

    def fetch_imagery(self, boundaries: List[float], time_range_days: int = 60) -> List[str]:
        """
        Fetch HLS imagery from Earthdata using earthaccess
        Returns list of downloaded GeoTIFF file paths
        """
        try:
            if len(boundaries) != 4:
                raise ValueError("Boundaries must be [min_lon, min_lat, max_lon, max_lat]")
            min_lon, min_lat, max_lon, max_lat = boundaries
            if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
                raise ValueError("Longitude must be between -180 and 180")
            if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
                raise ValueError("Latitude must be between -90 and 90")
            if min_lon >= max_lon or min_lat >= max_lat:
                raise ValueError("min_lon must be less than max_lon, min_lat must be less than max_lat")

            bbox = tuple(boundaries)

            end_date = datetime.now()
            start_date = end_date - timedelta(days=time_range_days)
            temporal = (start_date.isoformat(), end_date.isoformat())

            print("Searching for HLS data...")
            results = earthaccess.search_data(
                short_name="HLSS30",
                bounding_box=bbox,
                temporal=temporal,
                count=1   
            )

            if not results:
                raise Exception("No HLS data found for the given boundaries and time range")
            
            print("Downloading granule...")
            granule = results[0]
            downloaded_files = earthaccess.download(granule, local_path=self.download_folder)

            file_paths = [str(f) for f in downloaded_files if f.suffix == '.tif']
            print(f"Downloaded {len(file_paths)} TIFF files")

            if not file_paths:
                raise Exception("No TIFF files were downloaded")

            return file_paths

        except Exception as e:
            raise Exception(f"Imagery fetch failed: {str(e)}")

nasa_client = NasaClient()