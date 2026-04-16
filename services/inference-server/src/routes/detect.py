import json
import logging

from fastapi import APIRouter, File, Form, UploadFile

from ..inference.wilddet3d import run_detection
from ..schemas.detect import DetectionResponse
from ..utils.image import decode_depth_map, decode_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    image: UploadFile = File(...),
    text_prompts: str = Form(...),
    depth_map: UploadFile | None = File(None),
    score_threshold: float = Form(0.3),
    max_detections: int = Form(100),
):
    """
    Run WildDet3D 3D object detection on a single image.

    - **image**: JPEG/PNG image file
    - **text_prompts**: JSON array of text prompts (e.g. '["screw", "heatsink"]')
    - **depth_map**: Optional 16-bit PNG depth map (from LiDAR)
    - **score_threshold**: Minimum detection confidence (default 0.3)
    - **max_detections**: Maximum number of detections to return (default 100)
    """
    # Decode image
    image_bytes = await image.read()
    pil_image = decode_image(image_bytes)

    # Parse text prompts
    prompts = json.loads(text_prompts)

    # Decode depth map if provided
    depth = None
    if depth_map is not None:
        depth_bytes = await depth_map.read()
        if depth_bytes:
            depth = decode_depth_map(depth_bytes)

    logger.info(
        "Running detection: %d prompts, depth=%s, threshold=%.2f",
        len(prompts),
        depth is not None,
        score_threshold,
    )

    result = run_detection(
        image=pil_image,
        text_prompts=prompts,
        depth_map=depth,
        score_threshold=score_threshold,
        max_detections=max_detections,
    )

    logger.info(
        "Detection complete: %d detections in %.1fms",
        len(result.detections),
        result.inference_time_ms,
    )

    return result
