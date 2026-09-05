from typing import Iterable


def detect_pollution_regions(image_bytes: bytes) -> list[dict[str, float]]:
    """Placeholder vision contract; replace with a trained detector."""
    if not image_bytes:
        return []
    return [{"label": "possible_pollution", "confidence": 0.5}]
