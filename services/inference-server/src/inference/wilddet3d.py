"""
WildDet3D model wrapper.
Handles preprocessing, inference, and result extraction.
"""

import logging
import time
from typing import Any

import numpy as np
from PIL import Image

from ..config import settings
from ..model_loader import get_model, is_model_loaded
from ..schemas.detect import (
    BBox2D,
    BBox3D,
    Detection3D,
    DetectionResponse,
    Extent,
    Orientation,
    Vec3,
)
from .postprocess import apply_nms, filter_by_score

logger = logging.getLogger(__name__)


def run_detection(
    image: Image.Image,
    text_prompts: list[str],
    depth_map: np.ndarray | None = None,
    score_threshold: float = 0.3,
    max_detections: int = 100,
) -> DetectionResponse:
    """
    Run WildDet3D inference on an image with optional depth map.
    Returns structured detection results.
    """
    w, h = image.size
    start_time = time.perf_counter()

    if not is_model_loaded():
        # Mock mode: return empty detections for development without GPU
        logger.warning("Model not loaded, returning mock response")
        return DetectionResponse(
            detections=[],
            inference_time_ms=0.0,
            depth_available=depth_map is not None,
            image_size=(w, h),
        )

    model, preprocess = get_model()

    # Preprocess image
    import torch

    input_tensor = preprocess(image, max_size=settings.max_image_size)
    input_tensor = input_tensor.to(settings.device)
    if settings.fp16:
        input_tensor = input_tensor.half()

    # Preprocess depth map if available
    depth_tensor = None
    if depth_map is not None:
        depth_tensor = torch.from_numpy(depth_map).float().to(settings.device)
        if settings.fp16:
            depth_tensor = depth_tensor.half()

    # Run inference
    with torch.no_grad():
        kwargs: dict[str, Any] = {
            "text_prompts": text_prompts,
        }
        if depth_tensor is not None:
            kwargs["depth"] = depth_tensor

        outputs = model(input_tensor, **kwargs)

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # Extract results
    raw_detections = _extract_detections(
        outputs,
        text_prompts,
        depth_available=depth_map is not None,
    )

    # Post-process
    filtered = filter_by_score(raw_detections, score_threshold)
    nmsed = apply_nms(filtered)
    final = nmsed[:max_detections]

    return DetectionResponse(
        detections=final,
        inference_time_ms=round(elapsed_ms, 1),
        depth_available=depth_map is not None,
        image_size=(w, h),
    )


def _extract_detections(
    outputs: Any,
    text_prompts: list[str],
    depth_available: bool,
) -> list[Detection3D]:
    """Extract Detection3D objects from raw model outputs."""
    detections: list[Detection3D] = []

    # WildDet3D output format: boxes3d, scores, labels, (optional) boxes2d
    boxes3d = outputs.get("boxes3d", [])
    scores = outputs.get("scores", [])
    labels = outputs.get("labels", [])
    boxes2d = outputs.get("boxes2d", None)

    for i in range(len(scores)):
        score = float(scores[i])
        label_idx = int(labels[i])
        label = text_prompts[label_idx] if label_idx < len(text_prompts) else f"class_{label_idx}"

        # Extract 3D bounding box
        box = boxes3d[i]
        center = Vec3(x=float(box[0]), y=float(box[1]), z=float(box[2]))
        extent = Extent(width=float(box[3]), height=float(box[4]), depth=float(box[5]))
        orientation = Orientation(
            roll=float(box[6]) if len(box) > 6 else 0.0,
            pitch=float(box[7]) if len(box) > 7 else 0.0,
            yaw=float(box[8]) if len(box) > 8 else 0.0,
        )

        bbox3d = BBox3D(center=center, extent=extent, orientation=orientation)

        # Extract 2D bounding box if available
        bbox2d = None
        if boxes2d is not None and i < len(boxes2d):
            b2d = boxes2d[i]
            bbox2d = BBox2D(
                x=float(b2d[0]),
                y=float(b2d[1]),
                width=float(b2d[2]),
                height=float(b2d[3]),
            )

        detections.append(
            Detection3D(
                label=label,
                score=score,
                bbox3d=bbox3d,
                bbox2d=bbox2d,
                depth_used=depth_available,
            )
        )

    return detections
