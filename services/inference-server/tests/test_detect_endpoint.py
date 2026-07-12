"""End-to-end route tests that run in mock mode (no torch/GPU/weights needed).

With the model unavailable, ``run_detection`` returns an empty mock response,
which still exercises routing, multipart parsing and camelCase serialization.
"""

import io
import json

from fastapi.testclient import TestClient
from PIL import Image

from src.main import app

client = TestClient(app)


def _png_bytes(size: tuple[int, int] = (32, 32)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (128, 128, 128)).save(buf, format="PNG")
    return buf.getvalue()


def test_healthz_reports_model_state():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is False  # no torch/weights in the test env


def test_detect_mock_mode_returns_camelcase_contract():
    resp = client.post(
        "/detect",
        files={"image": ("capture.png", _png_bytes((32, 32)), "image/png")},
        data={"text_prompts": json.dumps(["screw", "heatsink"])},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {
        "detections",
        "inferenceTimeMs",
        "depthAvailable",
        "imageSize",
    }
    assert body["imageSize"] == [32, 32]
    assert body["detections"] == []


def test_detect_batch_mock_mode():
    resp = client.post(
        "/detect/batch",
        files=[
            ("images", ("a.png", _png_bytes(), "image/png")),
            ("images", ("b.png", _png_bytes(), "image/png")),
        ],
        data={"text_prompts": json.dumps(["screw"])},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) == 2
    assert all("inferenceTimeMs" in item for item in body)
