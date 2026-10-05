from flask import Flask, jsonify, request
from flask_cors import CORS

from prediction.predict import predict
from vision.pollution_detection import classify

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5177",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5177",
])


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "python-ai", "endpoints": ["/predict", "/classify"]})


@app.post("/predict")
def prediction():
    """Forecast AQI from fused station, satellite, weather and citizen features."""
    payload = request.get_json(silent=True) or {}
    features = payload.get("features", {})
    if not isinstance(features, dict):
        return jsonify({"error": "features must be an object"}), 400
    return jsonify(predict(features))


@app.post("/classify")
def classification():
    """Classify a citizen pollution photo from its atmospheric cues."""
    upload = request.files.get("image")
    if upload is None:
        return jsonify({"error": "an image file field named 'image' is required"}), 400
    image_bytes = upload.read()
    if not image_bytes:
        return jsonify({"error": "uploaded image is empty"}), 400
    return jsonify(classify(image_bytes, request.form.get("hint", "")))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)