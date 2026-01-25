#!/usr/bin/env python3
"""
score_prophet_forecast.py – Scoring entrypoint for Azure ML ManagedOnlineDeployment (Plan §4.1, §877).

Used when deploying revenue-forecasting-model to a Managed Online Endpoint.
Loads model.joblib (Prophet + interval_width, periods_default from train_prophet_forecast.py).
Request: {"history": [[ds, y], ...] or [{"ds":d,"y":v}], "periods": int (optional)} or
{"input": [{"history": [...], "periods": ...}]}. Response: {"p10": [...], "p50": [...], "p90": [...]}.
If history has dates, extend from max(ds); else use model.make_future_dataframe(periods). Model path: AZUREML_MODEL_DIR or cwd.
"""

import json
import os

import pandas as pd

_model = None
_periods_default = 30


def init():
    global _model, _periods_default
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
    _periods_default = int(artifact.get("periods_default", 30))


def run(raw_data):
    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    history = None
    periods = _periods_default
    if "input" in data and isinstance(data["input"], list) and data["input"]:
        row = data["input"][0]
        if isinstance(row, dict):
            history = row.get("history")
            if "periods" in row:
                periods = int(row.get("periods", _periods_default))
    if history is None:
        history = data.get("history", [])
    if "periods" in data:
        periods = int(data.get("periods", _periods_default))
    periods = max(1, min(periods, 365))

    last_ds = None
    if isinstance(history, list) and history:
        for r in history:
            if isinstance(r, (list, tuple)) and len(r) >= 1:
                d = r[0]
            elif isinstance(r, dict) and "ds" in r:
                d = r["ds"]
            else:
                continue
            try:
                t = pd.Timestamp(d)
                if last_ds is None or t > last_ds:
                    last_ds = t
            except Exception:
                pass

    if last_ds is not None:
        future = pd.DataFrame({"ds": pd.date_range(start=last_ds, periods=periods + 1, freq="D")[1:]})
    else:
        future = _model.make_future_dataframe(periods=periods)

    fcst = _model.predict(future)
    tail = fcst.tail(periods)
    p50 = tail["yhat"].fillna(0).tolist()
    p10 = tail["yhat_lower"].fillna(0).tolist() if "yhat_lower" in tail.columns else p50
    p90 = tail["yhat_upper"].fillna(0).tolist() if "yhat_upper" in tail.columns else p50
    return {"p10": p10, "p50": p50, "p90": p90}
