from src.inference.wilddet3d import _extract_detections


def test_extract_maps_labels_boxes_and_2d():
    outputs = {
        "boxes3d": [[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 10.0, 20.0, 30.0]],
        "scores": [0.85],
        "labels": [1],
        "boxes2d": [[0.0, 0.0, 100.0, 200.0]],
    }
    dets = _extract_detections(outputs, ["screw", "heatsink"], depth_available=True)
    assert len(dets) == 1
    d = dets[0]
    assert d.label == "heatsink"  # label index 1 -> prompts[1]
    assert d.score == 0.85
    assert (d.bbox3d.center.x, d.bbox3d.center.y, d.bbox3d.center.z) == (1.0, 2.0, 3.0)
    assert d.bbox3d.extent.depth == 6.0
    assert d.bbox3d.orientation.yaw == 30.0
    assert d.bbox2d is not None
    assert d.bbox2d.width == 100.0
    assert d.depth_used is True


def test_extract_defaults_orientation_and_2d_when_missing():
    outputs = {
        "boxes3d": [[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]],  # no orientation values
        "scores": [0.5],
        "labels": [0],
    }
    dets = _extract_detections(outputs, ["screw"], depth_available=False)
    assert dets[0].bbox3d.orientation.roll == 0.0
    assert dets[0].bbox3d.orientation.yaw == 0.0
    assert dets[0].bbox2d is None
    assert dets[0].depth_used is False


def test_extract_falls_back_when_label_index_out_of_range():
    outputs = {
        "boxes3d": [[0, 0, 0, 1, 1, 1]],
        "scores": [0.4],
        "labels": [7],  # beyond the provided prompts
    }
    dets = _extract_detections(outputs, ["screw"], depth_available=False)
    assert dets[0].label == "class_7"


def test_extract_handles_empty_outputs():
    assert _extract_detections({}, ["screw"], depth_available=False) == []
