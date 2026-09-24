from functools import lru_cache
from app.services.sectors_client import SectorsClient


@lru_cache
def get_sectors() -> SectorsClient:
    return SectorsClient()

