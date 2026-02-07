#!/usr/bin/env python3
"""
score_risk_scoring.py – Scoring entrypoint for Azure ML ManagedOnlineDeployment (Plan §4.1, §874).

Used when deploying risk-scoring-global or risk-scoring-{industry} to a Managed Online Endpoint.
Loads model.json (XGBoost Booster from train_risk_scoring.py), parses request
{"input": [{"feature1": v1, ...}]}, returns {"riskScore": float}. Feature order must match
train_risk_scoring REQUIRED (minus target_risk). Model path: AZUREML_MODEL_DIR or cwd.
"""

import json
import os

# Must match train_risk_scoring.py REQUIRED minus target_risk (same order as select_dtypes). Phase 2: sentiment_score; Phase 3: product_fit_score.
FEATURE_ORDER = [
    "amount",
    "probability",
    "days_to_close",
    "stage_encoded",
    "industry_encoded",
    "days_since_last_activity",
    "activity_count_30d",
    "stakeholder_count",
    "sentiment_score",
    "product_fit_score",
]

_model = None


def init():
    global _model
    base = os.environ.get("AZUREML_MODEL_DIR", os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base, "model.json"),
        os.path.join(base, "model", "model.json"),
    ]
    if os.path.isdir(base):
        try:
            for d in os.listdir(base):
                candidates.append(os.path.join(base, d, "model.json"))
        except OSError:
            pass
    path = None
    for p in candidates:
        if os.path.isfile(p):
            path = p
            break
    if not path:
        path = os.path.join(base, "model.json")
    import xgboost as xgb
    _model = xgb.Booster(model_file=path)


def run(raw_data):
    import numpy as np
    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    rows = data.get("input", data)
    if not isinstance(rows, list):
        rows = [rows]
    if not rows:
        return {"riskScore": 0.5}
    row = rows[0] if isinstance(rows[0], dict) else {}
    defaults = {"sentiment_score": 0.0, "product_fit_score": 0.5}
    vec = np.array([[float(row.get(f, defaults.get(f, 0))) for f in FEATURE_ORDER]], dtype=np.float32)
    import xgboost as xgb
    d = xgb.DMatrix(vec, feature_names=FEATURE_ORDER)
    pred = float(_model.predict(d)[0])
    pred = max(0.0, min(1.0, pred))
    return {"riskScore": pred}
