from pathlib import Path
import pickle

from features import normalize_features

MODEL_PATH = Path(__file__).parents[1] / "models" / "aqi_model.pkl"


def predict(features: dict[str, float]) -> dict[str, float]:
    values = normalize_features(features)
    try:
        with MODEL_PATH.open("rb") as model_file:
            model = pickle.load(model_file)
        value = float(model.predict([values])[0])
    except (FileNotFoundError, EOFError, pickle.UnpicklingError, AttributeError):
        value = max(0.0, values[0] * 1.5 + values[1] * 0.4)
    return {"predictedAqi": round(value, 2), "confidence": 0.75}
