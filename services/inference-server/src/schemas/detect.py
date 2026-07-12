from pydantic import BaseModel, ConfigDict


def to_camel(snake: str) -> str:
    """Convert snake_case to camelCase by only capitalizing letters that follow
    an underscore. Unlike pydantic's built-in ``to_camel``, this leaves embedded
    digits alone (``bbox3d`` stays ``bbox3d``), matching the TypeScript contract
    in lib/shared-types exactly.
    """
    head, *tail = snake.split("_")
    return head + "".join(word[:1].upper() + word[1:] for word in tail)


class CamelModel(BaseModel):
    """Base model that emits camelCase keys to match the TypeScript gateway
    contract (see lib/shared-types), while keeping snake_case field names in
    Python. ``populate_by_name`` keeps snake_case constructor kwargs working.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Vec3(CamelModel):
    x: float
    y: float
    z: float


class Orientation(CamelModel):
    roll: float
    pitch: float
    yaw: float


class Extent(CamelModel):
    width: float
    height: float
    depth: float


class BBox3D(CamelModel):
    center: Vec3
    extent: Extent
    orientation: Orientation
    rotation_matrix: list[list[float]] | None = None


class BBox2D(CamelModel):
    x: float
    y: float
    width: float
    height: float


class Detection3D(CamelModel):
    label: str
    score: float
    bbox3d: BBox3D
    bbox2d: BBox2D | None = None
    depth_used: bool = False


class DetectionResponse(CamelModel):
    detections: list[Detection3D]
    inference_time_ms: float
    depth_available: bool
    image_size: tuple[int, int]
