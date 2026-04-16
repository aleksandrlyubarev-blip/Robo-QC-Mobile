import json
import logging

from fastapi import APIRouter, File, Form, UploadFile

from ..inference.wilddet3d import run_detection
from ..schemas.detect import DetectionResponse
from ..utils.image import decode_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/detect/batch", response_model=list[DetectionResponse])
async def detect_batch(
    images: list[UploadFile] = File(...),
    text_prompts: str = Form(...),
    score_threshold: float = Form(0.3),
    max_detections: int = Form(100),
):
    """
    Run WildDet3D detection on multiple images sequentially.
    Useful for multi-angle captures of the same PCB.
    """
    prompts = json.loads(text_prompts)
    results: list[DetectionResponse] = []

    for i, img_file in enumerate(images):
        image_bytes = await img_file.read()
        pil_image = decode_image(image_bytes)

        logger.info("Batch detection: image %d/%d", i + 1, len(images))

        result = run_detection(
            image=pil_image,
            text_prompts=prompts,
            depth_map=None,
            score_threshold=score_threshold,
            max_detections=max_detections,
        )
        results.append(result)

    return results
