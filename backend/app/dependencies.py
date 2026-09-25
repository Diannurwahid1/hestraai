from functools import lru_cache
from app.services.sectors_client import SectorsClient
from app.services.sectors_meter import record_sectors_request


@lru_cache
def get_sectors() -> SectorsClient:
    return SectorsClient(usage_recorder=record_sectors_request)
