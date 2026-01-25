#!/usr/bin/env python3
"""
train_win_probability.py – BI Sales Risk (Plan §5.2, §5.6, §763; TRAINING_SCRIPTS_SPEC §3.2).

Trains win-probability-model. Input: Parquet with feature columns + target_win (0/1).
Filter: only rows where is_closed==1 so target is defined. XGBClassifier + CalibratedClassifierCV.
Output: win-probability-model. Signature: input = feature dict, output = {"winProbability": float, "confidence": float}.
Metrics: Brier score, AUC-ROC. Saves model.joblib (model + feature_columns). Azure ML register when AZURE_ML_* set.
With --deploy and AZURE_ML_*: ManagedOnlineEndpoint, ManagedOnlineDeployment (blue) with score_win_probability.py and conda-win-probability.yaml. Env: DEPLOY_INSTANCE_TYPE, DEPLOY_INSTANCE_COUNT.
Deps: pandas, xgboost, pyarrow, scikit-learn; azure-ai-ml, azure-identity for register/deploy.
"""

import argparse
import os
import sys

REQUIRED = [
    "amount",
    "probability",
    "days_to_close",
    "stage_encoded",
    "industry_encoded",
    "days_since_last_activity",
    "activity_count_30d",
    "stakeholder_count",
    "target_win",
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Train win-probability model (Plan §5.6, §763; TRAINING_SCRIPTS_SPEC §3.2)"
    )
    parser.add_argument("--input-path", required=True, help="Path to Parquet (Data Lake or local)")
    parser.add_argument("--input-dataset", default=None, help="Azure ML dataset (use --input-path when running locally)")
    parser.add_argument("--model-name", default="win-probability-model")
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--tenant-id", default=None, help="Optional tenant filter")
    parser.add_argument("--deploy", action="store_true", help="Deploy to Managed Endpoint after register")
    parser.add_argument("--param-n_estimators", type=int, default=200)
    parser.add_argument("--param-max_depth", type=int, default=6)
    parser.add_argument("--param-method", default="isotonic", choices=("isotonic", "sigmoid"), help="CalibratedClassifierCV method")
    parser.add_argument("--param-cv", type=int, default=5, help="CalibratedClassifierCV cv folds")
    args = parser.parse_args()

    try:
        import numpy as np
        import pandas as pd
        import xgboost as xgb
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.metrics import brier_score_loss, roc_auc_score
        import joblib
    except ImportError as e:
        print(f"Required: pip install pandas xgboost pyarrow scikit-learn. {e}", file=sys.stderr)
        return 1

    if args.input_dataset:
        print("--input-dataset: use Azure ML Job with DatasetConsumptionConfig; --input-path used here", file=sys.stderr)
    df = pd.read_parquet(args.input_path)
    if df.empty:
        print("Input is empty.", file=sys.stderr)
        return 1

    for c in REQUIRED:
        if c not in df.columns:
            print(f"Missing required column: {c}. Need: {REQUIRED}", file=sys.stderr)
            return 1

    # Filter: only closed deals so target_win is defined (TRAINING_SCRIPTS_SPEC §3.2)
    if "is_closed" in df.columns:
        df = df[df["is_closed"] == 1]
    df = df.dropna(subset=["target_win"])
    if df.empty:
        print("No rows after is_closed and target_win filter.", file=sys.stderr)
        return 1

    if args.tenant_id and "tenantId" in df.columns:
        df = df[df["tenantId"] == args.tenant_id]
    if df.empty:
        print("No rows after tenant filter.", file=sys.stderr)
        return 1

    y = df["target_win"].astype(int)
    if set(y.unique()) - {0, 1}:
        print("target_win must be 0 or 1.", file=sys.stderr)
        return 1

    drop_cols = ["target_win"]
    X = df.drop(columns=drop_cols).select_dtypes(include=[np.number]).fillna(0)

    base = xgb.XGBClassifier(
        objective="binary:logistic",
        n_estimators=args.param_n_estimators,
        max_depth=args.param_max_depth,
        eval_metric="logloss",
    )
    model = CalibratedClassifierCV(base, method=args.param_method, cv=args.param_cv)
    model.fit(X, y)

    # Metrics (TRAINING_SCRIPTS_SPEC §3.2)
    proba = model.predict_proba(X)[:, 1]
    brier = brier_score_loss(y, proba)
    try:
        auc = roc_auc_score(y, proba)
    except ValueError:
        auc = float("nan")
    print(f"Brier score: {brier:.4f}", file=sys.stderr)
    print(f"AUC-ROC: {auc:.4f}", file=sys.stderr)

    # Save: model + feature_columns for inference (output: winProbability, confidence)
    artifact = {"model": model, "feature_columns": list(X.columns)}
    joblib.dump(artifact, "model.joblib")

    # Register to Azure ML when AZURE_ML_* / ML_* env set (Plan §876, §5.6)
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
                    conda_path = os.path.join(script_dir, "conda-win-probability.yaml")
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
                            scoring_script="score_win_probability.py",
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
