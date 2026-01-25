#!/usr/bin/env python3
"""
score_lstm_trajectory.py – Scoring entrypoint for Azure ML ManagedOnlineDeployment (Plan §4.1, §875).

Used when deploying risk-trajectory-lstm to a Managed Online Endpoint.
Loads TensorFlow SavedModel from train_lstm_trajectory.py (risk_trajectory_lstm/saved_model).
Request: {"sequence": [[risk_score, activity_count_30d, days_since_last_activity], ...]} or
{"input": [{"sequence": [...]}]}. Response: {"risk_30": float, "risk_60": float, "risk_90": float, "confidence": float}.
Sequence length must match training (default 30); pad or truncate. Model path: AZUREML_MODEL_DIR or cwd.
"""

import json
import os

# Must match train_lstm_trajectory.py FEATURE_COLS and --sequence-length default
FEATURE_COLS = ["risk_score", "activity_count_30d", "days_since_last_activity"]
SEQUENCE_LENGTH = int(os.environ.get("SEQUENCE_LENGTH", "30"))

_model = None


def init():
    global _model
    import tensorflow as tf

    base = os.environ.get("AZUREML_MODEL_DIR", os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base, "saved_model"),
        os.path.join(base, "risk_trajectory_lstm", "saved_model"),
    ]
    if os.path.isdir(base):
        try:
            for d in os.listdir(base):
                p = os.path.join(base, d, "saved_model")
                if os.path.isdir(p):
                    candidates.append(p)
        except OSError:
            pass
    path = None
    for p in candidates:
        if os.path.isdir(p):
            path = p
            break
    if not path:
        path = os.path.join(base, "saved_model")
    _model = tf.keras.models.load_model(path)


def run(raw_data):
    import numpy as np

    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    seq_raw = data.get("sequence")
    if seq_raw is None and "input" in data:
        inp = data["input"]
        if isinstance(inp, list) and inp and isinstance(inp[0], dict):
            seq_raw = inp[0].get("sequence")
    if seq_raw is None:
        seq_raw = []

    if not isinstance(seq_raw, list):
        seq_raw = []

    seq_len = max(1, min(SEQUENCE_LENGTH, 90))
    # Each row: [risk_score, activity_count_30d, days_since_last_activity] or dict
    rows = []
    for r in seq_raw:
        if isinstance(r, (list, tuple)) and len(r) >= 3:
            rows.append([float(r[0]), float(r[1]), float(r[2])])
        elif isinstance(r, dict):
            rows.append([
                float(r.get(FEATURE_COLS[0], 0)),
                float(r.get(FEATURE_COLS[1], 0)),
                float(r.get(FEATURE_COLS[2], 0)),
            ])
        else:
            rows.append([0.0, 0.0, 0.0])

    if len(rows) > seq_len:
        rows = rows[-seq_len:]
    elif len(rows) < seq_len:
        pad = [[0.0, 0.0, 0.0]] * (seq_len - len(rows))
        rows = pad + rows

    arr = np.array([rows], dtype=np.float32)
    out = _model.predict(arr, verbose=0)[0]
    r30 = max(0.0, min(1.0, float(out[0])))
    r60 = max(0.0, min(1.0, float(out[1])))
    r90 = max(0.0, min(1.0, float(out[2])))
    return {"risk_30": r30, "risk_60": r60, "risk_90": r90, "confidence": 0.9}
