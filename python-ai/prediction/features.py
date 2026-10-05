from typing import Mapping

# Feature order shared with the trained model. Keep in sync with the trainer.
FEATURE_NAMES = ("pm25", "pm10", "temperature", "humidity", "wind_speed", "fire_load")


def normalize_features(features: Mapping[str, float]) -> list[float]:
    """Return model features in a stable order."""
    return [float(features.get(name, 0.0)) for name in FEATURE_NAMES]