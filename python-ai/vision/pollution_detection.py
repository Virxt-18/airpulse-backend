"""Lightweight pollution-photo classifier.

The heavy detector (YOLO/ResNet fine-tuned on CPCB-labelled citizen photos) is a
drop-in replacement for :func:`detect_pollution_regions`. Until that model exists
this extracts interpretable atmospheric cues from the image and scores them, so
report triage is evidence-based rather than a fixed confidence constant.
"""

from __future__ import annotations

import io

try:  # Pillow is optional: without it we return no signal instead of crashing.
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore[assignment]

LABELS = {
    "industrial_plume": "Possible industrial emission",
    "open_flame": "Possible open waste / biomass burning",
    "smoke_haze": "Possible smoke pollution",
    "dust_event": "Possible dust event",
    "no_clear_signal": "No clear pollution signal",
}


def _cues(image_bytes: bytes) -> dict[str, float] | None:
    """Return atmospheric cues from the image, or None if Pillow is unavailable."""
    if not image_bytes or Image is None:
        return None
    with Image.open(io.BytesIO(image_bytes)) as handle:
        small = handle.convert("RGB").resize((96, 96))
        pixels = list(small.getdata())

    count = len(pixels)
    if not count:
        return None
    greys = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in pixels]

    mean_grey = sum(greys) / count
    variance = sum((value - mean_grey) ** 2 for value in greys) / count
    contrast = variance ** 0.5

    warm = sum(1 for r, g, b in pixels if r > 150 and 70 < g < 170 and b < 110)
    hazy = sum(1 for value in greys if 150 <= value <= 225)
    bright = sum(1 for value in greys if value > 200)

    return {
        "warm_fraction": warm / count,
        "haze_fraction": hazy / count,
        "bright_fraction": bright / count,
        "contrast": contrast,
        "mean_grey": mean_grey,
    }


def _scores(cues: dict[str, float]) -> dict[str, float]:
    """Map cues to per-label scores in [0, 1]."""
    # Flames / crop residue: warm pixels, moderate brightness, low haze uniformity.
    flame = cues["warm_fraction"] * 2.4 + cues["bright_fraction"] * 0.8 + max(0.0, 40 - cues["contrast"]) / 200
    # Industrial plume: hazy, warm, low contrast.
    plume = cues["haze_fraction"] * 1.6 + cues["warm_fraction"] * 1.2 + max(0.0, 35 - cues["contrast"]) / 160
    # Smoke: hazy and desaturated overall.
    smoke = cues["haze_fraction"] * 1.4 + max(0.0, 60 - cues["contrast"]) / 120
    # Dust: uniformly bright with visible grain and no strong warm signal.
    dust = cues["mean_grey"] / 255 * 1.2 + min(1.0, cues["contrast"] / 60) * 0.5 - cues["warm_fraction"]
    return {
        "industrial_plume": max(0.0, plume),
        "open_flame": max(0.0, flame),
        "smoke_haze": max(0.0, smoke),
        "dust_event": max(0.0, dust),
    }


def detect_pollution_regions(image_bytes: bytes) -> list[dict[str, float]]:
    """Ranked pollution signals for a citizen photo."""
    cues = _cues(image_bytes)
    if cues is None:
        return []

    scores = _scores(cues)
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_label, top_score = ranked[0]

    if top_score < 0.6:
        return [{"label": LABELS["no_clear_signal"], "confidence": round(max(0.1, 1 - top_score), 3)}]

    total = sum(score for _, score in ranked) or 1.0
    return [
        {"label": LABELS[label], "confidence": round(min(0.99, score / total), 3)}
        for label, score in ranked[:2]
    ]


def classify(image_bytes: bytes, hint: str = "") -> dict[str, object]:
    """Single best label plus the cue values, for auditability."""
    regions = detect_pollution_regions(image_bytes)
    cues = _cues(image_bytes)
    best = regions[0] if regions else {"label": LABELS["no_clear_signal"], "confidence": 0.0}
    return {
        "label": best["label"],
        "confidence": best["confidence"],
        "model": "cue-baseline-v1",
        "alternatives": regions[1:],
        "signals": {key: round(value, 4) for key, value in (cues or {}).items()},
        "hintUsed": bool(hint),
    }