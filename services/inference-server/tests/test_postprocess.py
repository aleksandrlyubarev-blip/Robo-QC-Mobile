from src.inference.postprocess import apply_nms, filter_by_score
from src.schemas.detect import BBox3D, Detection3D, Extent, Orientation, Vec3


def _det(label: str, score: float, x: float = 0.0) -> Detection3D:
    return Detection3D(
        label=label,
        score=score,
        bbox3d=BBox3D(
            center=Vec3(x=x, y=0.0, z=0.0),
            extent=Extent(width=10.0, height=10.0, depth=10.0),
            orientation=Orientation(roll=0.0, pitch=0.0, yaw=0.0),
        ),
    )


def test_filter_by_score_drops_below_threshold():
    dets = [_det("screw", 0.9), _det("screw", 0.2), _det("screw", 0.5)]
    kept = filter_by_score(dets, 0.5)
    assert [d.score for d in kept] == [0.9, 0.5]


def test_filter_by_score_boundary_is_inclusive():
    assert len(filter_by_score([_det("screw", 0.3)], 0.3)) == 1


def test_nms_suppresses_close_same_label_keeping_higher_score():
    a = _det("screw", 0.9, x=0.0)
    b = _det("screw", 0.6, x=1.0)  # ~1mm apart, well within the extent diagonal
    kept = apply_nms([b, a], iou_threshold=0.5)
    assert len(kept) == 1
    assert kept[0].score == 0.9


def test_nms_keeps_distant_same_label():
    a = _det("screw", 0.9, x=0.0)
    b = _det("screw", 0.6, x=100.0)
    kept = apply_nms([a, b], iou_threshold=0.5)
    assert len(kept) == 2


def test_nms_keeps_different_labels_at_same_spot():
    a = _det("screw", 0.9, x=0.0)
    b = _det("heatsink", 0.6, x=0.0)
    kept = apply_nms([a, b], iou_threshold=0.5)
    assert len(kept) == 2


def test_nms_is_noop_for_single_detection():
    dets = [_det("screw", 0.9)]
    assert apply_nms(dets) == dets
