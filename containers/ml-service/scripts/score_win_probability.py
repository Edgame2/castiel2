#!/usr/bin/env python3
"""
score_win_probability.py – Scoring entrypoint for Azure ML ManagedOnlineDeployment (Plan §4.1, §876).

Used when deploying win-probability-model to a Managed Online Endpoint.
Loads model.joblib (CalibratedClassifierCV + feature_columns from train_win_probability.py), parses
request {"input": [{"feature1": v1, ...}]}, returns {"winProbability": float, "confidence": float}.
Feature order from artifact["feature_columns"]. Model path: AZUREML_MODEL_DIR or cwd.
"""

import json
import os

_model = None
_feature_columns = None


def init():
    global _model, _feature_columns
    import joblib

    base = os.environ.get("AZUREML_MODEL_DIR", os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base, "model.joblib"),
        os.path.join(base, "model", "model.joblib"),
    ]
    if os.path.isdir(base):
        try:
            for d in os.listdir(base):
                candidates.append(os.path.join(base, d, "model.joblib"))
        except OSError:
            pass
    path = None
    for p in candidates:
        if os.path.isfile(p):
            path = p
            break
    if not path:
        path = os.path.join(base, "model.joblib")
    artifact = joblib.load(path)
    _model = artifact.get("model")
    _feature_columns = artifact.get("feature_columns") or [
        "amount", "probability", "days_to_close", "stage_encoded", "industry_encoded",
        "days_since_last_activity", "activity_count_30d", "stakeholder_count",
    ]


def run(raw_data):
    import numpy as np

    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    rows = data.get("input", data)
    if not isinstance(rows, list):
        rows = [rows]
    if not rows:
        return {"winProbability": 0.5, "confidence": 0.5}
    row = rows[0] if isinstance(rows[0], dict) else {}
    cols = _feature_columns or []
    vec = np.array([[float(row.get(f, 0)) for f in cols]], dtype=np.float32)
    p = float(_model.predict_proba(vec)[0, 1])
    p = max(0.0, min(1.0, p))
    confidence = 0.9
    return {"winProbability": p, "confidence": confidence}
