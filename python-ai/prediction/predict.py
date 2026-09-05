from pathlib import Path
import pickle

from .features import normalize_features

MODEL_PATH = Path(__file__).parents[1] / "models" / "aqi_model.pkl"


def predict(features: dict[str, float]) -> dict[str, float]:
    values = normalize_features(features)
    current_aqi = max(0.0, float(features.get("current_aqi", values[0])))
    horizon_hours = max(1.0, float(features.get("horizon_hours", 24)))
    fire_detections = max(0.0, float(features.get("fire_detections", 0)))
    citizen_reports = max(0.0, float(features.get("citizen_reports", 0)))
    try:
        with MODEL_PATH.open("rb") as model_file:
            model = pickle.load(model_file)
        base_value = float(model.predict([values])[0])
    except (FileNotFoundError, EOFError, pickle.UnpicklingError, AttributeError):
        base_value = max(0.0, values[0] * 1.5 + values[1] * 0.4)

    wind_stagnation = max(0.0, 12.0 - values[4]) * 1.2
    humidity_factor = max(0.0, values[3] - 70.0) * 0.08
    horizon_factor = min(horizon_hours, 24.0) / 24.0
    increase = (base_value * 0.15 + wind_stagnation + humidity_factor +
                fire_detections * 4.0 + citizen_reports * 1.5) * horizon_factor
    predicted_aqi = max(current_aqi, current_aqi + increase)
    spike_probability = min(99.0, max(5.0, 35.0 + increase * 2.5))
    confidence = min(0.95, max(0.55, 0.7 + min(fire_detections, 5.0) * 0.03 +
                               min(citizen_reports, 5.0) * 0.02))
    return {
        "predictedAqi": round(predicted_aqi, 2),
        "spikeProbability": round(spike_probability, 2),
        "confidence": round(confidence, 2)
    }
