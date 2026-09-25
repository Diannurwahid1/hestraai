import base64
import hashlib
import hmac
import json
import time

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.session import Base
from app.models.research import PaymentRecord, SectorsRequestRecord, SubscriptionRecord
from app.services.billing_service import apply_webhook, create_checkout, estimate_unit_economics, start_trial, verify_webhook
from app.services.sectors_meter import sectors_usage_summary


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as value:
        yield value
    await engine.dispose()


def settings():
    secret = "whsec_" + base64.b64encode(b"test-webhook-secret").decode()
    return Settings(sumopod_api_key="sandbox-key", sumopod_webhook_secret=secret,
                    sumopod_base_url="https://api-pay-sandbox.sumopod.com",
                    frontend_origin="http://localhost:3000")


def signed_headers(raw: bytes, secret: str, event_id: str = "evt-1"):
    stamp = str(int(time.time()))
    message = event_id.encode() + b"." + stamp.encode() + b"." + raw
    expected = base64.b64encode(hmac.new(base64.b64decode(secret.removeprefix("whsec_")), message, hashlib.sha256).digest()).decode()
    return {"svix-id": event_id, "svix-timestamp": stamp, "svix-signature": f"v1,{expected}"}


@pytest.mark.asyncio
async def test_sandbox_checkout_and_verified_idempotent_webhook(session):
    async def handler(request: httpx.Request):
        payload = json.loads(request.content)
        assert request.url.host == "api-pay-sandbox.sumopod.com"
        assert request.headers["X-Api-Key"] == "sandbox-key"
        assert payload["amount"] == 399_000 and payload["currency"] == "IDR"
        return httpx.Response(200, json={"order_id": payload["order_id"], "amount": 399_000,
            "payment_id": "payment-1", "payment_link_url": "https://pay-sandbox.sumopod.com/pay/payment-1",
            "status": "pending"})
    result = await create_checkout(session, "user-1", "analyst", settings(), httpx.MockTransport(handler))
    assert result["environment"] == "sandbox" and result["status"] == "pending"
    assert await session.get(SubscriptionRecord, "user-1") is None
    payload = {"event_type": "payment.completed", "data": {"payment_id": "payment-1",
        "order_id": result["order_id"], "amount": 399_000, "status": "completed"}}
    raw = json.dumps(payload).encode()
    event_id = verify_webhook(raw, signed_headers(raw, settings().sumopod_webhook_secret), settings())
    first = await apply_webhook(session, event_id, payload)
    subscription = await session.get(SubscriptionRecord, "user-1")
    first_expiry = subscription.expires_at
    second = await apply_webhook(session, event_id, payload)
    assert first["status"] == "completed" and second["duplicate"] is True
    assert subscription.plan == "analyst" and subscription.expires_at == first_expiry


@pytest.mark.asyncio
async def test_sandbox_checkout_accepts_customer_paid_gateway_fee(session):
    async def handler(request: httpx.Request):
        order = json.loads(request.content)["order_id"]
        return httpx.Response(201, json={"order_id": order, "amount": 200_693,
            "fee": 1_693, "net_amount": 199_000, "currency": "IDR",
            "payment_id": "payment-fee", "payment_link_url": "https://pay-sandbox.sumopod.com/pay/payment-fee",
            "status": "pending"})
    result = await create_checkout(session, "user-1", "researcher", settings(), httpx.MockTransport(handler))
    assert result["status"] == "pending" and result["amount_idr"] == 199_000
    payload = {"event_type": "payment.completed", "data": {"payment_id": "payment-fee",
        "order_id": result["order_id"], "amount": 200_693, "fee": 1_693,
        "net_amount": 199_000, "status": "completed"}}
    assert (await apply_webhook(session, "evt-fee", payload))["status"] == "completed"
    subscription = await session.get(SubscriptionRecord, "user-1")
    assert subscription.plan == "researcher" and subscription.status == "active"


@pytest.mark.asyncio
async def test_sandbox_checkout_rejects_inconsistent_gateway_fee(session):
    async def handler(request: httpx.Request):
        order = json.loads(request.content)["order_id"]
        return httpx.Response(201, json={"order_id": order, "amount": 200_693,
            "fee": 1_000, "net_amount": 199_000,
            "payment_id": "payment-fee", "payment_link_url": "https://pay-sandbox.sumopod.com/pay/payment-fee",
            "status": "pending"})
    with pytest.raises(HTTPException) as error:
        await create_checkout(session, "user-1", "researcher", settings(), httpx.MockTransport(handler))
    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_forged_or_mismatched_webhook_never_activates(session):
    session.add(PaymentRecord(order_id="order-1", user_id="user-1", plan="researcher",
                              amount_idr=199_000, payment_id="payment-1", status="pending"))
    await session.commit()
    payload = {"event_type": "payment.completed", "data": {"payment_id": "payment-1", "order_id": "order-1",
        "amount": 1, "status": "completed"}}
    raw = json.dumps(payload).encode()
    with pytest.raises(HTTPException) as invalid:
        verify_webhook(raw, signed_headers(raw, settings().sumopod_webhook_secret, "evt-x") | {"svix-signature": "v1,wrong"}, settings())
    assert invalid.value.status_code == 401
    with pytest.raises(HTTPException) as mismatch:
        await apply_webhook(session, "evt-new", payload)
    assert mismatch.value.status_code == 400
    assert await session.get(SubscriptionRecord, "user-1") is None


@pytest.mark.asyncio
async def test_checkout_rejects_production_link(session):
    async def handler(request):
        order = json.loads(request.content)["order_id"]
        return httpx.Response(200, json={"order_id": order, "amount": 199_000, "status": "pending",
            "payment_id": "p", "payment_link_url": "https://pay.sumopod.com/pay/p"})
    with pytest.raises(HTTPException) as error:
        await create_checkout(session, "user-1", "researcher", settings(), httpx.MockTransport(handler))
    assert error.value.status_code == 502
    assert await session.get(SubscriptionRecord, "user-1") is None


@pytest.mark.asyncio
async def test_trial_is_seven_days_and_one_time(session):
    result = await start_trial(session, "user-1")
    assert result["status"] == "trial" and result["trial_used"] is True
    with pytest.raises(HTTPException) as error:
        await start_trial(session, "user-1")
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_sectors_usage_does_not_invent_credit_cost(session):
    session.add_all([
        SectorsRequestRecord(id="1", endpoint="/v2/company/report/ANTM/", cache_status="upstream", http_status=200),
        SectorsRequestRecord(id="2", endpoint="/v2/company/report/ANTM/", cache_status="hit"),
    ])
    await session.commit()
    summary = await sectors_usage_summary(session)
    assert summary["upstream_requests"] == 1 and summary["cache_hits"] == 1
    assert summary["sectors_credits"] is None


def test_economics_calculation_is_explicitly_hypothetical():
    scenario = estimate_unit_economics(0, 10, 1_059_000, 5_000, 200, "QRIS")
    assert scenario["revenue_idr"] == 3_990_000
    assert scenario["payment_gateway_fees_idr"] == 30_930
    assert scenario["remaining_before_hosting_tax_support_idr"] == 2_900_070
    assert scenario["maximum_active_users_at_assumed_burn"] == 25
    assert scenario["scenario_only"] is True
    assert estimate_unit_economics(0, 10, 1_059_000, 5_000, None)["maximum_active_users_at_assumed_burn"] is None
