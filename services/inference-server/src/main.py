import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .routes.batch import router as batch_router
from .routes.detect import router as detect_router
from .routes.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting inference server on device=%s, fp16=%s", settings.device, settings.fp16)
    # Pre-load model at startup (lazy init on first request if this fails)
    try:
        from .model_loader import get_model

        get_model()
    except Exception as e:
        logger.warning("Model pre-loading failed (will retry on first request): %s", e)
    yield


app = FastAPI(
    title="Robo-QC Inference Server",
    description="WildDet3D-powered 3D object detection for PCB quality control",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(detect_router)
app.include_router(batch_router)
