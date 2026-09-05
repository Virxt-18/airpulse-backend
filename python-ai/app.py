from flask import Flask, jsonify, request
from flask_cors import CORS

from prediction.predict import predict

app = Flask(__name__)
ORS(app, origins=["http://localhost:5177"])

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "python-ai"})


@app.post("/predict")
def prediction():
    payload = request.get_json(silent=True) or {}
    return jsonify(predict(payload.get("features", {})))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
