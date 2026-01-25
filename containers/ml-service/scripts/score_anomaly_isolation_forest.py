#!/usr/bin/env python3
"""
score_anomaly_isolation_forest.py – Scoring entrypoint for Azure ML ManagedOnlineDeployment (Plan §4.1; TRAINING_SCRIPTS_SPEC §3.4).

Used when deploying anomaly-detection-isolation-forest to a Managed Online Endpoint.
Loads model.joblib (IsolationForest + feature_columns from train_anomaly_isolation_forest.py), parses
request {"input": [{"feature1": v1, ...}]}, returns {"isAnomaly": int (-1|1), "anomalyScore": float}.
Feature order from artifact["feature_columns"]. anomalyScore: higher = more anomalous (-decision_function).
Model path: AZUREML_MODEL_DIR or cwd.
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
    _feature_columns = artifact.get("feature_columns") or []


def run(raw_data):
    import numpy as np

    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    rows = data.get("input", data)
    if not isinstance(rows, list):
        rows = [rows]
    if not rows:
        return {"isAnomaly": 1, "anomalyScore": 0.0}
    row = rows[0] if isinstance(rows[0], dict) else {}
    cols = _feature_columns or (list(row.keys()) if isinstance(row, dict) else [])
    if not cols:
        return {"isAnomaly": 1, "anomalyScore": 0.0}
    vec = np.array([[float(row.get(f, 0)) for f in cols]], dtype=np.float32)
    pred = int(_model.predict(vec)[0])
    # decision_function: lower = more abnormal; use -df so higher = more anomalous
    df = float(_model.decision_function(vec)[0])
    anomaly_score = float(-df)
    return {"isAnomaly": pred, "anomalyScore": anomaly_score}
