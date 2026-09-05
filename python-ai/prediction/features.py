from typing import Mapping


def normalize_features(features: Mapping[str, float]) -> list[float]:
    """Return model features in a stable order."""
    names = ("pm25", "pm10", "temperature", "humidity", "wind_speed")
    return [float(features.get(name, 0.0)) for name in names]
