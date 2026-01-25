#!/usr/bin/env python3
"""
train_anomaly_isolation_forest.py – BI Sales Risk (Plan §5.2, §5.6; TRAINING_SCRIPTS_SPEC §3.4).

Trains anomaly-detection-isolation-forest. Input: Parquet with feature columns only (no target).
Optional is_anomaly for labeled validation. sklearn.ensemble.IsolationForest.
Output: anomaly-detection-isolation-forest. Signature: input = feature dict, output = {"isAnomaly": int (-1/1), "anomalyScore": float}.
Saves model.joblib (model + feature_columns). Azure ML register when AZURE_ML_* set.
With --deploy and AZURE_ML_*: ManagedOnlineEndpoint, ManagedOnlineDeployment (blue) with score_anomaly_isolation_forest.py and conda-anomaly.yaml. Env: DEPLOY_INSTANCE_TYPE, DEPLOY_INSTANCE_COUNT.
Deps: pandas, pyarrow, scikit-learn; azure-ai-ml, azure-identity for register/deploy.
"""

import argparse
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Train anomaly-detection Isolation Forest (Plan §5.6; TRAINING_SCRIPTS_SPEC §3.4)"
    )
    parser.add_argument("--input-path", required=True, help="Path to Parquet with feature columns (no target required)")
    parser.add_argument("--input-dataset", default=None, help="Azure ML dataset (use --input-path when local)")
    parser.add_argument("--model-name", default="anomaly-detection-isolation-forest")
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--tenant-id", default=None, help="Optional tenant filter (if tenantId column exists)")
    parser.add_argument("--deploy", action="store_true", help="Deploy to Managed Endpoint after register")
    parser.add_argument("--param-contamination", type=float, default=0.1, help="IsolationForest contamination (expected anomaly fraction)")
    parser.add_argument("--param-n_estimators", type=int, default=100, help="IsolationForest n_estimators")
    args = parser.parse_args()

    try:
        import numpy as np
        import pandas as pd
        import joblib
        from sklearn.ensemble import IsolationForest
        from sklearn.metrics import f1_score
    except ImportError as e:
        print(f"Required: pip install pandas pyarrow scikit-learn. {e}", file=sys.stderr)
        return 1

    if args.input_dataset:
        print("--input-dataset: use Azure ML Job with DatasetConsumptionConfig; --input-path used here", file=sys.stderr)

    df = pd.read_parquet(args.input_path)
    if df.empty:
        print("Input is empty.", file=sys.stderr)
        return 1

    if args.tenant_id and "tenantId" in df.columns:
        df = df[df["tenantId"] == args.tenant_id]
    if df.empty:
        print("No rows after tenant filter.", file=sys.stderr)
        return 1

    # Optional is_anomaly for validation only; exclude from features (TRAINING_SCRIPTS_SPEC §3.4)
    has_labels = "is_anomaly" in df.columns
    drop = [c for c in ["is_anomaly"] if c in df.columns]
    X = df.drop(columns=drop, errors="ignore").select_dtypes(include=[np.number]).fillna(0)
    if X.empty or len(X.columns) == 0:
        print("No numeric feature columns. Need at least one.", file=sys.stderr)
        return 1
    if len(X) < 2:
        print("Need at least 2 rows to fit IsolationForest.", file=sys.stderr)
        return 1

    clf = IsolationForest(
        contamination=args.param_contamination,
        n_estimators=args.param_n_estimators,
        random_state=42,
    )
    clf.fit(X)

    f1 = None
    if has_labels:
        y = df["is_anomaly"].astype(int)
        # Map is_anomaly 1 -> -1 (anomaly), 0 -> 1 (normal) to match IsolationForest
        y_if = np.where(y == 1, -1, 1)
        pred = clf.predict(X)
        f1 = float(f1_score(y_if, pred, pos_label=-1, zero_division=0))
        print(f"Labeled validation F1 (anomaly): {f1:.4f}", file=sys.stderr)

    # Log to Azure ML run when executed as an Azure ML Job (TRAINING_SCRIPTS_SPEC §3.4; Plan Phase 2)
    if f1 is not None:
        try:
            from azureml.core import Run

            run = Run.get_context()
            if run and getattr(run, "id", None) and "OfflineRun" not in str(getattr(run, "id", "")):
                run.log("F1", f1)
        except Exception:
            pass  # not in Azure ML or azureml-core not installed; stderr already printed

    artifact = {"model": clf, "feature_columns": list(X.columns)}
    joblib.dump(artifact, "model.joblib")

    # Register to Azure ML when AZURE_ML_* / ML_* env set (Plan Phase 2, §5.6)
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
            model_entity = Model(name=args.model_name, path="model.joblib")
            registered = ml_client.models.create_or_update(model_entity)
            print(f"Registered model {args.model_name} in Azure ML.", file=sys.stderr)

            if args.deploy:
                try:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    endpoint_name = f"{args.model_name}-ep"
                    instance_type = os.environ.get("DEPLOY_INSTANCE_TYPE", "Standard_DS2_v2")
                    instance_count = int(os.environ.get("DEPLOY_INSTANCE_COUNT", "1"))
                    conda_path = os.path.join(script_dir, "conda-anomaly.yaml")
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
                            scoring_script="score_anomaly_isolation_forest.py",
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
            print(f"Azure ML register skipped (pip install azure-ai-ml azure-identity): {e}. Model saved as model.joblib.", file=sys.stderr)
        except Exception as e:
            print(f"Azure ML register failed: {e}. Model saved as model.joblib.", file=sys.stderr)
    else:
        print("AZURE_ML_* / ML_* env not set; model saved as model.joblib. Register in Azure ML Job.", file=sys.stderr)
        if args.deploy:
            print("--deploy ignored (AZURE_ML_* not set).", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
