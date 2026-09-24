from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import ai_model, auth, chat, companies, context, dashboard, discover, investigations, onboarding, research_memory
from app.core.config import get_settings
from app.db.session import init_db
from app.services.sectors_client import SectorsError
from app.api.auth import get_current_user


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Hestra AI API", version="0.1.0", lifespan=lifespan)
settings = get_settings()
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/api")
for router in (ai_model.router, dashboard.router, discover.router, companies.router, investigations.router, research_memory.router, context.router, chat.router, onboarding.router):
    app.include_router(router, prefix="/api", dependencies=[Depends(get_current_user)])


@app.get("/api/health")
async def health():
    return {"status": "ok", "sectors_configured": bool(settings.sectors_api_key), "llm_provider": settings.llm_provider}


@app.exception_handler(SectorsError)
async def sectors_error(_: Request, exc: SectorsError):
    return JSONResponse(status_code=503, content={"error": {"code": exc.code, "message": str(exc)}})
