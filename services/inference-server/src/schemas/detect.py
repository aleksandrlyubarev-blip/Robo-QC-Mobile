from pydantic import BaseModel


class Vec3(BaseModel):
    x: float
    y: float
    z: float


class Orientation(BaseModel):
    roll: float
    pitch: float
    yaw: float


class Extent(BaseModel):
    width: float
    height: float
    depth: float


class BBox3D(BaseModel):
    center: Vec3
    extent: Extent
    orientation: Orientation
    rotation_matrix: list[list[float]] | None = None


class BBox2D(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection3D(BaseModel):
    label: str
    score: float
    bbox3d: BBox3D
    bbox2d: BBox2D | None = None
    depth_used: bool = False


class DetectionResponse(BaseModel):
    detections: list[Detection3D]
    inference_time_ms: float
    depth_available: bool
    image_size: tuple[int, int]
