from fastapi import APIRouter

from ..model_loader import is_model_loaded

router = APIRouter()


@router.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "model_loaded": is_model_loaded(),
    }
