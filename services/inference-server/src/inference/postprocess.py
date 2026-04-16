"""
Post-processing utilities for 3D detections:
non-maximum suppression, score filtering, coordinate transforms.
"""

import math

from ..schemas.detect import Detection3D


def filter_by_score(
    detections: list[Detection3D],
    threshold: float,
) -> list[Detection3D]:
    """Filter detections below the score threshold."""
    return [d for d in detections if d.score >= threshold]


def apply_nms(
    detections: list[Detection3D],
    iou_threshold: float = 0.5,
) -> list[Detection3D]:
    """
    Apply 3D non-maximum suppression based on center distance
    and extent overlap. Simple approach: suppress detections of
    the same label that are too close together.
    """
    if len(detections) <= 1:
        return detections

    # Sort by score descending
    sorted_dets = sorted(detections, key=lambda d: d.score, reverse=True)
    kept: list[Detection3D] = []

    for det in sorted_dets:
        suppress = False
        for kept_det in kept:
            if det.label != kept_det.label:
                continue
            dist = _center_distance(det, kept_det)
            avg_size = _average_extent(det, kept_det)
            if avg_size > 0 and dist / avg_size < iou_threshold:
                suppress = True
                break
        if not suppress:
            kept.append(det)

    return kept


def _center_distance(a: Detection3D, b: Detection3D) -> float:
    """Euclidean distance between two detection centers."""
    ca, cb = a.bbox3d.center, b.bbox3d.center
    return math.sqrt(
        (ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2 + (ca.z - cb.z) ** 2
    )


def _average_extent(a: Detection3D, b: Detection3D) -> float:
    """Average diagonal extent of two detections."""
    ea, eb = a.bbox3d.extent, b.bbox3d.extent
    diag_a = math.sqrt(ea.width**2 + ea.height**2 + ea.depth**2)
    diag_b = math.sqrt(eb.width**2 + eb.height**2 + eb.depth**2)
    return (diag_a + diag_b) / 2
