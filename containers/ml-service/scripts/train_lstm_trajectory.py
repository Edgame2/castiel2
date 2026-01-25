#!/usr/bin/env python3
"""
train_lstm_trajectory.py – BI Sales Risk (Plan §5.2, §5.6, §763; TRAINING_SCRIPTS_SPEC §3.3).

Trains risk-trajectory-lstm. Input: Parquet with sequences per opportunityId
[risk_score, activity_count_30d, days_since_last_activity] + target_risk at t+30/t+60/t+90.
Output: risk-trajectory-lstm. Signature: input {"sequence": [[f1,f2,f3],...]}, output {"risk_30","risk_60","risk_90","confidence"}.
With --deploy and AZURE_ML_*: ManagedOnlineEndpoint, ManagedOnlineDeployment (blue) with score_lstm_trajectory.py and conda-lstm.yaml. Env: DEPLOY_INSTANCE_TYPE, DEPLOY_INSTANCE_COUNT.
Deps: pandas, pyarrow; tensorflow for LSTM. Azure ML register when AZURE_ML_* set (azure-ai-ml, azure-identity for register/deploy).
"""

import argparse
import os
import sys

FEATURE_COLS = ["risk_score", "activity_count_30d", "days_since_last_activity"]
TARGET_COLS = ["target_risk_30", "target_risk_60", "target_risk_90"]
# fallback if only target_risk
TARGET_ALIAS = "target_risk"


def main() -> int:
    parser = argparse.ArgumentParser(description="Train risk-trajectory LSTM (Plan §5.6, §763; TRAINING_SCRIPTS_SPEC §3.3)")
    parser.add_argument("--input-path", required=True, help="Parquet: opportunityId, snapshotDate, risk_score, activity_count_30d, days_since_last_activity, target_risk_30/60/90 (or target_risk)")
    parser.add_argument("--model-name", default="risk-trajectory-lstm")
    parser.add_argument("--sequence-length", type=int, default=30, help="Sequence length; pad or truncate")
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--tenant-id", default=None)
    parser.add_argument("--deploy", action="store_true")
    parser.add_argument("--param-units", type=int, default=64, help="LSTM units")
    parser.add_argument("--param-epochs", type=int, default=50)
    args = parser.parse_args()

    try:
        import numpy as np
        import pandas as pd
    except ImportError as e:
        print(f"Need: pandas, pyarrow. {e}", file=sys.stderr)
        return 1

    try:
        from tensorflow import keras
        from tensorflow.keras import layers
    except ImportError:
        print("Need: pip install tensorflow. LSTM requires TensorFlow.", file=sys.stderr)
        return 1

    df = pd.read_parquet(args.input_path)
    if df.empty:
        print("Input is empty.", file=sys.stderr)
        return 1

    # Columns: prefer risk_score; allow riskScore. Same for activity_count_30d (activity_count_30d), days_since_last_activity
    ren = {}
    if "riskScore" in df.columns and "risk_score" not in df.columns:
        ren["riskScore"] = "risk_score"
    for c in FEATURE_COLS:
        if c not in df.columns and c.replace("_", "") in [x.replace("_", "") for x in df.columns]:
            pass  # use as-is if close match
    df = df.rename(columns=ren)

    for c in FEATURE_COLS:
        if c not in df.columns:
            print(f"Missing feature column: {c}. Need {FEATURE_COLS}. Columns: {list(df.columns)}", file=sys.stderr)
            return 1

    # Targets: target_risk_30/60/90 or a single target_risk duplicated
    targets = [t for t in TARGET_COLS if t in df.columns]
    if not targets and TARGET_ALIAS in df.columns:
        df["target_risk_30"] = df[TARGET_ALIAS]
        df["target_risk_60"] = df[TARGET_ALIAS]
        df["target_risk_90"] = df[TARGET_ALIAS]
        targets = TARGET_COLS
    if not targets:
        print(f"Missing targets: {TARGET_COLS} or {TARGET_ALIAS}. Columns: {list(df.columns)}", file=sys.stderr)
        return 1

    need_id = "opportunityId" in df.columns or "opportunity_id" in df.columns
    if not need_id:
        print("Recommend opportunityId (or opportunity_id) to group sequences. Proceeding with row order.", file=sys.stderr)

    date_col = "snapshotDate" if "snapshotDate" in df.columns else ("date" if "date" in df.columns else None)
    if date_col:
        df = df.sort_values([df.columns[0] if "opportunityId" not in df.columns else "opportunityId", date_col])

    # Build sequences per opportunityId
    seq_len = max(1, min(args.sequence_length, 90))
    X_seqs, y_seqs = [], []
    if "opportunityId" in df.columns:
        for _oid, g in df.groupby("opportunityId"):
            g = g.sort_values(date_col) if date_col and date_col in g.columns else g
            feat = g[FEATURE_COLS].fillna(0).values.astype(np.float32)
            if len(feat) < 2:
                continue
            if len(feat) > seq_len:
                feat = feat[-seq_len:]
            else:
                pad = np.zeros((seq_len - len(feat), len(FEATURE_COLS)), dtype=np.float32)
                feat = np.concatenate([pad, feat], axis=0)
            tcols = [t for t in TARGET_COLS if t in g.columns]
            if not tcols:
                continue
            y_row = [g[tcols[0]].iloc[-1] if t in g.columns else 0.5 for t in TARGET_COLS]
            X_seqs.append(feat)
            y_seqs.append(y_row)
    else:
        feat = df[FEATURE_COLS].fillna(0).values.astype(np.float32)
        if len(feat) < 2:
            print("Too few rows for a sequence.", file=sys.stderr)
            return 1
        if len(feat) > seq_len:
            feat = feat[-seq_len:]
        else:
            pad = np.zeros((seq_len - len(feat), len(FEATURE_COLS)), dtype=np.float32)
            feat = np.concatenate([pad, feat], axis=0)
        y_row = [df[t].iloc[-1] if t in df.columns else 0.5 for t in TARGET_COLS]
        X_seqs.append(feat)
        y_seqs.append(y_row)

    if not X_seqs:
        print("No sequences built. Need opportunityId and multiple rows per opportunity, or enough rows.", file=sys.stderr)
        return 1

    X = np.stack(X_seqs, axis=0)
    y = np.array(y_seqs, dtype=np.float32)

    model = keras.Sequential([
        layers.Input(shape=(X.shape[1], X.shape[2])),
        layers.LSTM(args.param_units, return_sequences=False),
        layers.Dense(64, activation="relu"),
        layers.Dense(3),
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    history = model.fit(X, y, epochs=args.param_epochs, validation_split=0.1, verbose=1)

    # Metrics (Plan §875): final epoch loss, val_loss, mae, val_mae
    h = history.history
    loss = float(h["loss"][-1]) if h.get("loss") else 0.0
    val_loss = float(h["val_loss"][-1]) if h.get("val_loss") else 0.0
    mae = float(h["mae"][-1]) if h.get("mae") else 0.0
    val_mae = float(h["val_mae"][-1]) if h.get("val_mae") else 0.0
    print(f"final loss: {loss:.4f}, val_loss: {val_loss:.4f}, mae: {mae:.4f}, val_mae: {val_mae:.4f}", file=sys.stderr)

    # Log to Azure ML run when executed as an Azure ML Job (Plan §875)
    try:
        from azureml.core import Run

        run = Run.get_context()
        if run and getattr(run, "id", None) and "OfflineRun" not in str(getattr(run, "id", "")):
            run.log("loss", loss)
            run.log("val_loss", val_loss)
            run.log("mae", mae)
            run.log("val_mae", val_mae)
    except Exception:
        pass  # not in Azure ML or azureml-core not installed; stderr already printed

    out_dir = "risk_trajectory_lstm"
    os.makedirs(out_dir, exist_ok=True)
    model.save(os.path.join(out_dir, "saved_model"))

    # Register to Azure ML when AZURE_ML_* / ML_* env set (Plan §875, §5.6)
    sub = os.environ.get("AZURE_ML_SUBSCRIPTION_ID") or os.environ.get("ML_SUBSCRIPTION_ID")
    rg = os.environ.get("AZURE_ML_RESOURCE_GROUP") or os.environ.get("ML_RESOURCE_GROUP") or "castiel-ml-prod-rg"
    ws = os.environ.get("AZURE_ML_WORKSPACE_NAME") or os.environ.get("ML_WORKSPACE_NAME")
    if sub and rg and ws:
        try:
            from azure.identity import DefaultAzureCredential
            from azure.ai.ml import MLClient
            from azure.ai.ml.entities import (
                Model,
                ManagedOnlineEndpoint,
                ManagedOnlineDeployment,
                CodeConfiguration,
                Environment,
            )

            ml_client = MLClient(DefaultAzureCredential(), sub, rg, ws)
            model_entity = Model(name=args.model_name, path=out_dir)
            registered = ml_client.models.create_or_update(model_entity)
            print(f"Registered model {args.model_name} in Azure ML.", file=sys.stderr)

            if args.deploy:
                try:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    endpoint_name = f"{args.model_name}-ep"
                    instance_type = os.environ.get("DEPLOY_INSTANCE_TYPE", "Standard_DS2_v2")
                    instance_count = int(os.environ.get("DEPLOY_INSTANCE_COUNT", "1"))
                    conda_path = os.path.join(script_dir, "conda-lstm.yaml")
                    env = Environment(
                        conda_file=conda_path,
                        image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04:latest",
                    )
                    endpoint = ManagedOnlineEndpoint(name=endpoint_name, auth_mode="key")
                    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
                    deployment = ManagedOnlineDeployment(
                        name="blue",
                        endpoint_name=endpoint_name,
                        model=registered,
                        environment=env,
                        code_configuration=CodeConfiguration(
                            code=script_dir,
                            scoring_script="score_lstm_trajectory.py",
                        ),
                        instance_type=instance_type,
                        instance_count=instance_count,
                    )
                    ml_client.online_deployments.begin_create_or_update(deployment).result()
                    endpoint.traffic = {"blue": 100}
                    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
                    print(f"Deployed to Managed Endpoint {endpoint_name} (blue).", file=sys.stderr)
                except Exception as de:
                    print(f"Azure ML deploy failed: {de}.", file=sys.stderr)
                    raise
        except ImportError as e:
            print(f"Azure ML register skipped (pip install azure-ai-ml azure-identity): {e}. Model saved as {out_dir}/saved_model.", file=sys.stderr)
        except Exception as e:
            print(f"Azure ML register failed: {e}. Model saved as {out_dir}/saved_model.", file=sys.stderr)
    else:
        print(f"AZURE_ML_* / ML_* env not set; model saved as {out_dir}/saved_model. Register in Azure ML Job.", file=sys.stderr)
        if args.deploy:
            print("--deploy ignored (AZURE_ML_* not set).", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
