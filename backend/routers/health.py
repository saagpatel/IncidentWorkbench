"""Health check router."""

from fastapi import APIRouter

from database import db
from services.ollama_client import OllamaClient

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> dict:
    """Health check endpoint."""
    # Check database connectivity
    try:
        conn = db.get_connection()
        cursor = conn.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        db_status = "ok"
    except Exception:
        db_status = "error"

    # Check Ollama availability
    ollama_client = OllamaClient()
    try:
        is_available = await ollama_client.is_available()
        ollama_status = "ok" if is_available else "unavailable"
    except Exception:
        ollama_status = "error"
    finally:
        await ollama_client.close()

    return {
        "status": "ok",
        "database": db_status,
        "ollama": ollama_status,
    }


@router.get("/live")
async def liveness() -> dict:
    """Liveness probe used by orchestration/runtime checks."""
    return {"status": "ok"}


@router.get("/ready")
async def readiness() -> dict:
    """Readiness probe that confirms dependencies are reachable."""
    conn = db.get_connection()
    try:
        conn.execute("SELECT 1").fetchone()
    finally:
        conn.close()

    return {"status": "ready"}
