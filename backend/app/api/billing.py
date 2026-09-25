"""Publicly verifiable sandbox webhook; authenticated checkout and status."""

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_session
from app.models.research import PaymentRecord, SubscriptionRecord, UserRecord
from app.schemas.common import Envelope, ResponseMeta
from app.services.billing_service import apply_webhook, create_checkout, estimate_unit_economics, serialize_subscription, start_trial, verify_webhook
from app.services.sectors_meter import sectors_usage_summary

router = APIRouter(tags=["billing"])
webhook_router = APIRouter(tags=["billing-webhook"])


class CheckoutInput(BaseModel):
    plan: str


class EconomicsInput(BaseModel):
    researchers: int = Field(ge=0, le=100_000)
    analysts: int = Field(ge=0, le=100_000)
    sectors_monthly_cost_idr: int = Field(ge=0)
    sectors_monthly_credits: int = Field(ge=0)
    average_credits_per_user: float | None = Field(default=None, gt=0)
    payment_method: str = Field(default="QRIS", pattern="^(QRIS|QRIS_INSTANT)$")


def require_operator(user: UserRecord) -> None:
    if not get_settings().hestra_admin_email or user.email.lower() != get_settings().hestra_admin_email.lower():
        raise HTTPException(403, "Operator access required")


@router.get("/billing/status")
async def billing_status(user: UserRecord = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    subscription = await session.get(SubscriptionRecord, user.id)
    payments = (await session.scalars(select(PaymentRecord).where(PaymentRecord.user_id == user.id)
                                      .order_by(PaymentRecord.created_at.desc()).limit(5))).all()
    return Envelope(data={"environment": "sandbox", "subscription": serialize_subscription(subscription),
                          "payments": [{"order_id": item.order_id, "plan": item.plan, "amount_idr": item.amount_idr,
                                        "status": item.status, "created_at": item.created_at.isoformat() + "Z"}
                                       for item in payments]}, meta=ResponseMeta(source="database"))


@router.get("/billing/orders/{order_id}")
async def order_status(order_id: str, user: UserRecord = Depends(get_current_user),
                       session: AsyncSession = Depends(get_session)):
    payment = await session.get(PaymentRecord, order_id)
    if not payment or payment.user_id != user.id:
        raise HTTPException(404, "Sandbox order not found")
    return Envelope(data={"order_id": payment.order_id, "plan": payment.plan,
                          "amount_idr": payment.amount_idr, "status": payment.status,
                          "created_at": payment.created_at.isoformat() + "Z"},
                    meta=ResponseMeta(source="database"))


@router.get("/billing/sectors-usage")
async def upstream_usage(user: UserRecord = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_operator(user)
    return Envelope(data=await sectors_usage_summary(session), meta=ResponseMeta(source="database"))


@router.post("/billing/economics")
async def economics(request: EconomicsInput, user: UserRecord = Depends(get_current_user)):
    require_operator(user)
    result = estimate_unit_economics(**request.model_dump())
    return Envelope(data=result, meta=ResponseMeta(source="database"))


@router.post("/billing/trial")
async def trial(user: UserRecord = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return Envelope(data=await start_trial(session, user.id), meta=ResponseMeta(source="database"))


@router.post("/billing/checkout")
async def checkout(request: CheckoutInput, user: UserRecord = Depends(get_current_user),
                   session: AsyncSession = Depends(get_session)):
    result = await create_checkout(session, user.id, request.plan, get_settings())
    return Envelope(data=result, meta=ResponseMeta(source="database"))


@webhook_router.post("/billing/sumopod/webhook")
async def sumopod_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    raw = await request.body()
    if len(raw) > 64_000:
        raise HTTPException(413, "Webhook is too large")
    event_id = verify_webhook(raw, {key.lower(): value for key, value in request.headers.items()}, get_settings())
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, "Invalid webhook JSON") from exc
    if not isinstance(payload, dict):
        raise HTTPException(400, "Invalid webhook payload")
    return await apply_webhook(session, event_id, payload)
