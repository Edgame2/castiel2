#!/usr/bin/env python3
"""
train_risk_scoring.py – BI Sales Risk (Plan §5.2, §5.6; TRAINING_SCRIPTS_SPEC §3.1).

Trains risk-scoring-global or risk-scoring-{industry}. Input: Parquet with feature columns + target_risk.
Output: Registered model in Azure ML; optional deploy to Managed Endpoint (--deploy).
With --deploy and AZURE_ML_*: creates ManagedOnlineEndpoint, ManagedOnlineDeployment (blue) with score_risk_scoring.py and conda-risk-scoring.yaml; traffic 100% to blue. Env: DEPLOY_INSTANCE_TYPE (default Standard_DS2_v2), DEPLOY_INSTANCE_COUNT (default 1).
Run as Azure ML Job or locally with --input-path. Deps: pandas, xgboost, pyarrow; azure-ai-ml, azure-identity for register/deploy.
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
    "target_risk",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Train risk-scoring model (Plan §5.6, TRAINING_SCRIPTS_SPEC §3.1)")
    parser.add_argument("--input-path", required=True, help="Path to Parquet (Data Lake or local)")
    parser.add_argument("--input-dataset", default=None, help="Azure ML dataset name (alternative to --input-path)")
    parser.add_argument("--model-name", default="risk-scoring-global", help="risk-scoring-global or risk-scoring-{industryId}")
    parser.add_argument("--industry-id", default=None, help="For industry model; sets model-name if model-name is default")
    parser.add_argument("--run-name", default=None, help="Azure ML run name")
    parser.add_argument("--tenant-id", default=None, help="Optional tenant filter")
    parser.add_argument("--deploy", action="store_true", help="Deploy to Managed Endpoint after register")
    parser.add_argument("--param-n_estimators", type=int, default=200)
    parser.add_argument("--param-max_depth", type=int, default=6)
    args = parser.parse_args()

    model_name = args.model_name
    if args.industry_id and args.model_name == "risk-scoring-global":
        model_name = f"risk-scoring-{args.industry_id}"

    try:
        import numpy as np
        import pandas as pd
        import xgboost as xgb
    except ImportError as e:
        print(f"Required: pip install pandas xgboost pyarrow. For Azure ML register: azure-ai-ml azure-identity. {e}", file=sys.stderr)
        return 1

    # Load data
    if args.input_dataset:
        # Azure ML: use DatasetConsumptionConfig in job; for CLI assume --input-path is used
        print("--input-dataset: use Azure ML Job with DatasetConsumptionConfig; --input-path used here", file=sys.stderr)
    df = pd.read_parquet(args.input_path)
    if df.empty:
        print("Input is empty; cannot train. Provide Parquet with required columns.", file=sys.stderr)
        return 1

    for c in REQUIRED:
        if c not in df.columns:
            print(f"Missing required column: {c}. Need: {REQUIRED}", file=sys.stderr)
            return 1

    if args.tenant_id and "tenantId" in df.columns:
        df = df[df["tenantId"] == args.tenant_id]
    if df.empty:
        print("No rows after tenant filter.", file=sys.stderr)
        return 1

    X = df.drop(columns=["target_risk"]).select_dtypes(include=[np.number]).fillna(0)
    y = df["target_risk"].clip(0, 1)

    model = xgb.XGBRegressor(objective="reg:squarederror", n_estimators=args.param_n_estimators, max_depth=args.param_max_depth)
    model.fit(X, y)

    model.get_booster().save_model("model.json")

    # Register to Azure ML when AZURE_ML_* / ML_* env set (Plan §874, §5.6)
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
            model_entity = Model(name=model_name, path="model.json")
            registered = ml_client.models.create_or_update(model_entity)
            print(f"Registered model {model_name} in Azure ML.", file=sys.stderr)

            if args.deploy:
                try:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    endpoint_name = f"{model_name}-ep"
                    instance_type = os.environ.get("DEPLOY_INSTANCE_TYPE", "Standard_DS2_v2")
                    instance_count = int(os.environ.get("DEPLOY_INSTANCE_COUNT", "1"))
                    conda_path = os.path.join(script_dir, "conda-risk-scoring.yaml")
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
                            scoring_script="score_risk_scoring.py",
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
            print(f"Azure ML register skipped (pip install azure-ai-ml azure-identity): {e}. Model saved as model.json.", file=sys.stderr)
        except Exception as e:
            print(f"Azure ML register failed: {e}. Model saved as model.json.", file=sys.stderr)
    else:
        print("AZURE_ML_* / ML_* env not set; model saved as model.json. Register in Azure ML Job.", file=sys.stderr)
        if args.deploy:
            print("--deploy ignored (AZURE_ML_* not set).", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
