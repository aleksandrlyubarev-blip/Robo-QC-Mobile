"""Image utility functions for preprocessing."""

from io import BytesIO

import numpy as np
from PIL import Image


def decode_image(data: bytes) -> Image.Image:
    """Decode image bytes to PIL Image (RGB)."""
    return Image.open(BytesIO(data)).convert("RGB")


def decode_depth_map(data: bytes) -> np.ndarray:
    """Decode 16-bit PNG depth map to numpy array (float32, meters)."""
    img = Image.open(BytesIO(data))
    arr = np.array(img, dtype=np.float32)
    # Convert from millimeters to meters if values suggest mm encoding
    if arr.max() > 100:
        arr = arr / 1000.0
    return arr


def resize_if_needed(image: Image.Image, max_size: int) -> Image.Image:
    """Resize image so the largest dimension does not exceed max_size."""
    w, h = image.size
    if max(w, h) <= max_size:
        return image
    scale = max_size / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    return image.resize((new_w, new_h), Image.LANCZOS)
