"""Database-backed local accounts and expiring bearer sessions."""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.config import get_settings
from app.models.research import SessionRecord, UserRecord
from app.schemas.common import Envelope, ResponseMeta

router = APIRouter(tags=["auth"])
PASSWORD_ITERATIONS = 260_000


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class RegisterRequest(LoginRequest):
    name: str = Field(min_length=2, max_length=160)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=200)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, iterations, salt, digest = encoded.split("$")
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def serialize_user(user: UserRecord) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


async def get_current_user(authorization: str = Header(default=""),
                           session: AsyncSession = Depends(get_session)) -> UserRecord:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Sign in required")
    record = await session.get(SessionRecord, token_hash(token))
    if not record or record.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    user = await session.get(UserRecord, record.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Account unavailable")
    return user


async def issue_session(user: UserRecord, session: AsyncSession) -> dict:
    token = secrets.token_urlsafe(36)
    session.add(SessionRecord(token_hash=token_hash(token), user_id=user.id,
                              expires_at=datetime.utcnow() + timedelta(days=30)))
    await session.commit()
    return {"token": token, "user": serialize_user(user)}


@router.post("/auth/register")
async def register(request: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if not get_settings().public_registration_enabled:
        raise HTTPException(status_code=403, detail="Registration is currently closed")
    email = request.email.strip().lower()
    if await session.scalar(select(UserRecord).where(UserRecord.email == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    if len(request.password) < 10:
        raise HTTPException(status_code=422, detail="Password must contain at least 10 characters")
    user = UserRecord(id=str(uuid.uuid4()), email=email, name=request.name.strip(),
                      password_hash=hash_password(request.password))
    session.add(user)
    await session.flush()
    return Envelope(data=await issue_session(user, session), meta=ResponseMeta(source="database"))


@router.get("/auth/registration")
async def registration_status():
    return Envelope(data={"enabled": get_settings().public_registration_enabled},
                    meta=ResponseMeta(source="database"))


@router.post("/auth/login")
async def login(request: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = await session.scalar(select(UserRecord).where(UserRecord.email == request.email.strip().lower()))
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Envelope(data=await issue_session(user, session), meta=ResponseMeta(source="database"))


@router.get("/auth/me")
async def me(user: UserRecord = Depends(get_current_user)):
    return Envelope(data={"user": serialize_user(user)}, meta=ResponseMeta(source="database"))


@router.post("/auth/logout")
async def logout(authorization: str = Header(default=""), session: AsyncSession = Depends(get_session)):
    record = await session.get(SessionRecord, token_hash(authorization.removeprefix("Bearer ").strip()))
    if record:
        await session.delete(record)
        await session.commit()
    return Envelope(data={"signed_out": True}, meta=ResponseMeta(source="database"))


@router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, user: UserRecord = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    db_user = await session.get(UserRecord, user.id)
    if not verify_password(request.current_password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    db_user.password_hash = hash_password(request.new_password)
    await session.commit()
    return Envelope(data={"updated": True}, meta=ResponseMeta(source="database"))
