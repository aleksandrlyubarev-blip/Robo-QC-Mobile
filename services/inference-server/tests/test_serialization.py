"""The inference server must emit camelCase keys so the TypeScript gateway
(lib/shared-types) can parse responses without a translation layer."""

import pytest

from src.schemas.detect import (
    BBox2D,
    BBox3D,
    Detection3D,
    DetectionResponse,
    Extent,
    Orientation,
    Vec3,
    to_camel,
)


@pytest.mark.parametrize(
    "snake, camel",
    [
        ("inference_time_ms", "inferenceTimeMs"),
        ("depth_available", "depthAvailable"),
        ("image_size", "imageSize"),
        ("depth_used", "depthUsed"),
        ("rotation_matrix", "rotationMatrix"),
        # Digit-bearing names must stay lowercase to match the TS contract;
        # pydantic's built-in to_camel would wrongly produce "bbox3D".
        ("bbox3d", "bbox3d"),
        ("bbox2d", "bbox2d"),
        ("x", "x"),
    ],
)
def test_to_camel_matches_ts_contract(snake, camel):
    assert to_camel(snake) == camel


def _response() -> DetectionResponse:
    det = Detection3D(
        label="screw",
        score=0.9,
        bbox3d=BBox3D(
            center=Vec3(x=1.0, y=2.0, z=3.0),
            extent=Extent(width=4.0, height=5.0, depth=6.0),
            orientation=Orientation(roll=0.0, pitch=0.0, yaw=0.0),
        ),
        bbox2d=BBox2D(x=0.0, y=0.0, width=10.0, height=20.0),
        depth_used=True,
    )
    return DetectionResponse(
        detections=[det],
        inference_time_ms=12.3,
        depth_available=True,
        image_size=(640, 480),
    )


def test_response_top_level_keys_are_camelcase():
    payload = _response().model_dump(by_alias=True)
    assert set(payload.keys()) == {
        "detections",
        "inferenceTimeMs",
        "depthAvailable",
        "imageSize",
    }
    assert tuple(payload["imageSize"]) == (640, 480)


def test_detection_keys_are_camelcase():
    det = _response().model_dump(by_alias=True)["detections"][0]
    assert "depthUsed" in det
    assert "depth_used" not in det
    assert det["bbox3d"]["center"]["x"] == 1.0


def test_json_dump_uses_aliases():
    payload = _response().model_dump(mode="json", by_alias=True)
    assert payload["imageSize"] == [640, 480]
    assert payload["detections"][0]["depthUsed"] is True


def test_constructor_accepts_snake_case_field_names():
    # populate_by_name keeps Python-side construction ergonomic (snake_case).
    d = Detection3D(
        label="x",
        score=0.1,
        bbox3d=BBox3D(
            center=Vec3(x=0, y=0, z=0),
            extent=Extent(width=1, height=1, depth=1),
            orientation=Orientation(roll=0, pitch=0, yaw=0),
        ),
        depth_used=True,
    )
    assert d.depth_used is True
