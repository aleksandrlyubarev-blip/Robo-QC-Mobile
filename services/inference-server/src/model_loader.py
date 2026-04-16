"""
Singleton model loader for WildDet3D.
Loads the model once at startup and keeps it in GPU memory.
"""

import logging
from typing import Any

from .config import settings

logger = logging.getLogger(__name__)

_model: Any = None
_preprocess: Any = None


def get_model():
    """Get the loaded WildDet3D model (lazy singleton)."""
    global _model, _preprocess
    if _model is None:
        _model, _preprocess = _load_model()
    return _model, _preprocess


def _load_model():
    """Load WildDet3D model and preprocess function."""
    try:
        import torch
        from wilddet3d import build_model, preprocess

        logger.info(
            "Loading WildDet3D model from %s on %s (fp16=%s)",
            settings.model_weights_path,
            settings.device,
            settings.fp16,
        )

        model = build_model(
            weights_path=settings.model_weights_path,
            device=settings.device,
        )

        if settings.fp16:
            model = model.half()

        model.eval()

        # Warmup: run a dummy inference to pre-allocate CUDA memory
        logger.info("Running warmup inference...")
        dummy = torch.zeros(1, 3, 640, 640, device=settings.device)
        if settings.fp16:
            dummy = dummy.half()
        with torch.no_grad():
            try:
                model(dummy, text_prompts=["test"])
            except Exception:
                # Warmup may fail with dummy input shape; that's OK
                pass

        logger.info("WildDet3D model loaded and ready")
        return model, preprocess

    except ImportError:
        logger.warning(
            "WildDet3D or torch not installed. Running in mock mode. "
            "Install with: pip install -e '.[gpu]'"
        )
        return None, None


def is_model_loaded() -> bool:
    """Check if the real model is loaded (vs mock mode)."""
    return _model is not None
