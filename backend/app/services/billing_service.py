"""Sandbox-only payment checkout and verified subscription transitions.

This is one-time 30-day access, not an automatic recurring mandate. The
onboarding profile plan is intentionally separate from paid entitlement.
"""

import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.research import PaymentRecord, PaymentWebhookEventRecord, SubscriptionRecord


PLAN_PRICES = {"researcher": 199_000, "analyst": 399_000}
SANDBOX_API_HOST = "api-pay-sandbox.sumopod.com"
SANDBOX_PAY_HOST = "pay-sandbox.sumopod.com"


def estimate_unit_economics(researchers: int, analysts: int, sectors_monthly_cost_idr: int,
                            sectors_monthly_credits: int, average_credits_per_user: float | None,
                            payment_method: str = "QRIS") -> dict:
    """Scenario calculation only; no value here is an observed Sectors credit cost."""
    fee_rate = {"QRIS": .007, "QRIS_INSTANT": .015}[payment_method]
    revenue = researchers * PLAN_PRICES["researcher"] + analysts * PLAN_PRICES["analyst"]
    fees = round(researchers * (PLAN_PRICES["researcher"] * fee_rate + 300)
                 + analysts * (PLAN_PRICES["analyst"] * fee_rate + 300))
    capacity = int(sectors_monthly_credits // average_credits_per_user) if average_credits_per_user else None
    return {"scenario_only": True, "revenue_idr": revenue, "payment_gateway_fees_idr": fees,
            "sectors_monthly_cost_idr": sectors_monthly_cost_idr,
            "remaining_before_hosting_tax_support_idr": revenue - fees - sectors_monthly_cost_idr,
            "maximum_active_users_at_assumed_burn": capacity,
            "planned_users": researchers + analysts,
            "credit_budget_sufficient": capacity >= researchers + analysts if capacity is not None else None,
            "disclosure": "All costs, credit budget and per-user burn are operator-supplied assumptions, not measured Sectors credits."}


def verify_webhook(raw: bytes, headers: dict[str, str], settings: Settings, now: int | None = None) -> str:
    if settings.sumopod_webhook_secret:
        event_id = headers.get("svix-id", "")
        timestamp = headers.get("svix-timestamp", "")
        signature = headers.get("svix-signature", "")
        try:
            timestamp_number = int(timestamp)
            secret = base64.b64decode(settings.sumopod_webhook_secret.removeprefix("whsec_"), validate=True)
        except (ValueError, TypeError, binascii.Error) as exc:
            raise HTTPException(401, "Invalid webhook signature") from exc
        if not event_id or len(event_id) > 100 or abs((now or int(time.time())) - timestamp_number) > 300:
            raise HTTPException(401, "Webhook timestamp is invalid or expired")
        signed = event_id.encode() + b"." + timestamp.encode() + b"." + raw
        expected = base64.b64encode(hmac.new(secret, signed, hashlib.sha256).digest()).decode()
        candidates = [part.removeprefix("v1,") for part in signature.split() if part.startswith("v1,")]
        if not any(hmac.compare_digest(expected, candidate) for candidate in candidates):
            raise HTTPException(401, "Invalid webhook signature")
        return event_id
    if settings.sumopod_webhook_token:
        token = headers.get("x-webhook-token", "")
        if not hmac.compare_digest(token, settings.sumopod_webhook_token):
            raise HTTPException(401, "Invalid webhook token")
        event_id = headers.get("svix-id") or hashlib.sha256(raw).hexdigest()
        if len(event_id) > 100:
            raise HTTPException(401, "Invalid webhook ID")
        return event_id
    raise HTTPException(503, "SumoPod webhook verification is not configured")


def _sandbox_url(url: str, host: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == host and parsed.port in (None, 443)


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError:
        return None


def serialize_subscription(record: SubscriptionRecord | None) -> dict:
    if not record:
        return {"plan": None, "status": "none", "expires_at": None, "trial_used": False}
    status = "expired" if record.expires_at <= datetime.utcnow() else record.status
    return {"plan": record.plan, "status": status, "expires_at": record.expires_at.isoformat() + "Z",
            "trial_used": record.trial_used}


async def start_trial(session: AsyncSession, user_id: str) -> dict:
    existing = await session.get(SubscriptionRecord, user_id)
    if existing and (existing.trial_used or existing.status == "active"):
        raise HTTPException(409, "Trial already used or a paid sandbox plan exists")
    now = datetime.utcnow()
    record = existing or SubscriptionRecord(user_id=user_id, plan="trial", status="trial",
                                             starts_at=now, expires_at=now + timedelta(days=7), trial_used=True)
    if existing:
        record.plan, record.status, record.starts_at = "trial", "trial", now
        record.expires_at, record.trial_used = now + timedelta(days=7), True
    else:
        session.add(record)
    await session.commit()
    return serialize_subscription(record)


async def create_checkout(session: AsyncSession, user_id: str, plan: str, settings: Settings,
                          transport: httpx.AsyncBaseTransport | None = None) -> dict:
    if plan not in PLAN_PRICES:
        raise HTTPException(422, "This plan is not available for sandbox checkout")
    if not _sandbox_url(settings.sumopod_base_url, SANDBOX_API_HOST):
        raise HTTPException(503, "Only the SumoPod sandbox API is allowed")
    if not settings.sumopod_api_key or not (settings.sumopod_webhook_secret or settings.sumopod_webhook_token):
        raise HTTPException(503, "SumoPod sandbox API key and webhook verification are required")
    order_id = "HES-SBX-" + secrets.token_hex(12).upper()
    amount = PLAN_PRICES[plan]
    record = PaymentRecord(order_id=order_id, user_id=user_id, plan=plan, amount_idr=amount)
    session.add(record)
    await session.commit()
    origin = settings.frontend_origin.rstrip("/")
    payload = {"order_id": order_id, "amount": amount, "currency": "IDR", "expires_in_hours": 24,
               "payment_method_type_code": "QRIS",
               "success_return_url": f"{origin}/billing/result?order_id={order_id}",
               "cancel_return_url": f"{origin}/billing/result?order_id={order_id}&cancelled=1"}
    try:
        async with httpx.AsyncClient(base_url=settings.sumopod_base_url, timeout=15, transport=transport) as client:
            response = await client.post("/api/v1/payments", json=payload, headers={"X-Api-Key": settings.sumopod_api_key})
            response.raise_for_status()
            result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Invalid sandbox payment response")
        url = result.get("payment_link_url", "")
        if (result.get("order_id") != order_id or result.get("amount") != amount or
                result.get("status") != "pending" or not result.get("payment_id") or
                not _sandbox_url(url, SANDBOX_PAY_HOST)):
            raise ValueError("SumoPod sandbox returned an invalid or non-sandbox payment link")
        record.payment_id = str(result["payment_id"])
        record.payment_url = url
        record.status = "pending"
        record.expires_at = _parse_time(result.get("expires_at")) or datetime.utcnow() + timedelta(hours=24)
        await session.commit()
        return {"order_id": order_id, "status": "pending", "payment_url": url,
                "expires_at": record.expires_at.isoformat() + "Z", "amount_idr": amount, "plan": plan,
                "environment": "sandbox"}
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as exc:
        record.status = "failed"
        await session.commit()
        raise HTTPException(502, "SumoPod sandbox checkout is unavailable or returned an unsafe link") from exc


async def apply_webhook(session: AsyncSession, event_id: str, payload: dict) -> dict:
    event_type = payload.get("event_type")
    if event_type == "payment.test":
        return {"received": True, "test": True}
    if event_type not in {"payment.completed", "payment.failed", "payment.expired"}:
        raise HTTPException(422, "Unsupported webhook event")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise HTTPException(422, "Missing payment data")
    order_id = data.get("order_id")
    if not isinstance(order_id, str):
        raise HTTPException(422, "Missing order ID")
    if await session.get(PaymentWebhookEventRecord, event_id):
        return {"received": True, "duplicate": True}
    payment = await session.scalar(select(PaymentRecord).where(PaymentRecord.order_id == order_id).with_for_update())
    if not payment or payment.payment_id != data.get("payment_id") or payment.amount_idr != data.get("amount"):
        raise HTTPException(400, "Webhook payment does not match a sandbox order")
    expected_status = event_type.removeprefix("payment.")
    if data.get("status") != expected_status:
        raise HTTPException(400, "Webhook event and payment status disagree")
    if payment.status != "completed":
        if expected_status == "completed":
            payment.status = "completed"
            payment.completed_at = _parse_time(data.get("paid_at")) or datetime.utcnow()
            now = datetime.utcnow()
            subscription = await session.get(SubscriptionRecord, payment.user_id)
            previous_end = subscription.expires_at if subscription and subscription.status == "active" and subscription.expires_at > now else now
            if subscription:
                subscription.plan, subscription.status = payment.plan, "active"
                subscription.starts_at, subscription.expires_at = now, previous_end + timedelta(days=30)
            else:
                session.add(SubscriptionRecord(user_id=payment.user_id, plan=payment.plan, status="active",
                                               starts_at=now, expires_at=now + timedelta(days=30), trial_used=False))
        elif payment.status in {"creating", "pending"}:
            payment.status = expected_status
    session.add(PaymentWebhookEventRecord(event_id=event_id, order_id=order_id, event_type=event_type))
    await session.commit()
    return {"received": True, "status": payment.status}
