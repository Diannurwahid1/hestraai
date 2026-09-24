import pytest
from fastapi import HTTPException

from app.api import auth
from app.core.config import Settings


@pytest.mark.asyncio
async def test_registration_is_closed_before_database_access(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: Settings(public_registration_enabled=False))
    request = auth.RegisterRequest(name="Researcher", email="new@example.invalid", password="long-password")

    with pytest.raises(HTTPException) as caught:
        await auth.register(request, session=None)

    assert caught.value.status_code == 403
    assert "closed" in caught.value.detail.lower()
    status = await auth.registration_status()
    assert status.data == {"enabled": False}
