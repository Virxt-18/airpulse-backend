"""AQI spike forecaster.

If ``models/aqi_model.pkl`` holds a trained estimator it is used. Otherwise the
service falls back to ``baseline_aqi_forecast`` - a transparent, physically
motivated accumulator (stagnation + humidity + smoke load + citizen pressure) so
predictions degrade gracefully instead of failing. Swap in a real model by
replacing the pickle; nothing else changes.
"""

from pathlib import Path
import math
import pickle

from .features import normalize_features

MODEL_PATH = Path(__file__).parents[1] / "models" / "aqi_model.pkl"


def _load_model():
    if not MODEL_PATH.exists():
        return None
    try:
        with MODEL_PATH.open("rb") as model_file:
            model = pickle.load(model_file)
    except Exception:  # placeholder or incompatible artefact
        return None
    return model if hasattr(model, "predict") else None


def baseline_aqi_forecast(features: dict[str, float]) -> float:
    """Transparent fallback forecast for ``horizon_hours`` ahead."""
    current_aqi = max(0.0, float(features.get("current_aqi", 0.0)))
    pm25 = float(features.get("pm25", 0.0))
    wind_speed = float(features.get("wind_speed", 12.0))
    humidity = float(features.get("humidity", 60.0))
    fire_load = float(features.get("fire_load", 0.0))
    fire_detections = float(features.get("fire_detections", 0.0))
    citizen_reports = float(features.get("citizen_reports", 0.0))
    horizon_hours = max(1.0, float(features.get("horizon_hours", 24)))

    stagnation = max(0.0, 12.0 - wind_speed) * 1.2
    humidity_load = max(0.0, humidity - 70.0) * 0.08
    # fire_load is summed fire radiative power in MW; use log scaling so a few
    # megaton-scale fires cannot dominate the forecast.
    smoke = min(45.0, 4.0 * math.log1p(fire_load)) + min(20.0, fire_detections * 2.0)
    pressure = min(12.0, citizen_reports * 1.5)
    horizon_factor = min(horizon_hours, 24.0) / 24.0
    # AQI rarely falls fast; persistence dominates, accumulation is the increment.
    decay = min(0.12, max(0.0, wind_speed) * 0.01) * max(0.0, current_aqi - pm25 * 2.2)

    increase = (stagnation + humidity_load + smoke + pressure) * horizon_factor - decay
    return max(0.0, current_aqi + increase)


def predict(features: dict[str, float]) -> dict[str, float]:
    values = normalize_features(features)
    current_aqi = max(0.0, float(features.get("current_aqi", values[0] * 2)))
    horizon_hours = max(1.0, float(features.get("horizon_hours", 24)))
    fire_detections = max(0.0, float(features.get("fire_detections", 0)))
    citizen_reports = max(0.0, float(features.get("citizen_reports", 0)))
    humidity = float(features.get("humidity", 60.0))
    wind_speed = float(features.get("wind_speed", 0.0))

    model = _load_model()
    if model is not None:
        try:
            predicted_aqi = max(0.0, float(model.predict([values])[0]))
        except Exception:
            predicted_aqi = baseline_aqi_forecast(features)
    else:
        predicted_aqi = baseline_aqi_forecast(features)

    delta = max(0.0, predicted_aqi - current_aqi)
    spike_probability = min(99.0, max(5.0, 35.0 + delta * 2.5))
    confidence = min(
        0.95,
        max(
            0.55,
            0.62
            + min(fire_detections, 5.0) * 0.03
            + min(citizen_reports, 5.0) * 0.02
            + (0.05 if wind_speed < 6 else 0.0)
            + (0.03 if humidity > 70 else 0.0),
        ),
    )

    return {
        "predictedAqi": round(predicted_aqi, 2),
        "spikeProbability": round(spike_probability, 2),
        "confidence": round(confidence, 2),
        "model": "trained" if model is not None else "baseline-accumulator",
        "horizonHours": horizon_hours,
    }