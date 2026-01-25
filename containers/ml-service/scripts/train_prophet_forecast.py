#!/usr/bin/env python3
"""
train_prophet_forecast.py – BI Sales Risk (Plan §5.2, §5.6, §877; TRAINING_SCRIPTS_SPEC §3.5).

Trains revenue-forecasting-model. Input: Parquet with time series (date, revenue) or (date, pipeline_value).
Prophet for P10/P50/P90 via uncertainty intervals. Output: revenue-forecasting-model.
Signature: input = {"history": [...]}, output = {"p10": [...], "p50": [...], "p90": [...]}.
Saves model.joblib (Prophet model + interval_width, periods_default). Azure ML register when AZURE_ML_* set.
With --deploy and AZURE_ML_*: ManagedOnlineEndpoint, ManagedOnlineDeployment (blue) with score_prophet_forecast.py and conda-prophet.yaml. Env: DEPLOY_INSTANCE_TYPE, DEPLOY_INSTANCE_COUNT.
Deps: pandas, pyarrow, prophet; azure-ai-ml, azure-identity for register/deploy.
"""

import argparse
import os
import sys

DATE_COLS = ("date", "ds")
VALUE_COLS = ("revenue", "y", "pipeline_value", "target_revenue")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Train revenue-forecasting Prophet model (Plan §5.6, §877; TRAINING_SCRIPTS_SPEC §3.5)"
    )
    parser.add_argument("--input-path", required=True, help="Path to Parquet: (date, revenue) or (ds, y) time series")
    parser.add_argument("--input-dataset", default=None, help="Azure ML dataset (use --input-path when local)")
    parser.add_argument("--model-name", default="revenue-forecasting-model")
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--tenant-id", default=None, help="Optional tenant filter (if tenantId column exists)")
    parser.add_argument("--deploy", action="store_true", help="Deploy to Managed Endpoint (TODO)")
    parser.add_argument("--date-col", default=None, help="Date column (default: date or ds)")
    parser.add_argument("--value-col", default=None, help="Value column (default: revenue, y, pipeline_value, or target_revenue)")
    parser.add_argument("--param-interval_width", type=float, default=0.8, help="Prophet uncertainty interval (0.8 => P10/P90)")
    parser.add_argument("--param-periods", type=int, default=30, help="Default periods for make_future_dataframe at inference")
    parser.add_argument("--param-yearly_seasonality", default="auto", choices=("auto", "true", "false"))
    parser.add_argument("--param-weekly_seasonality", default="auto", choices=("auto", "true", "false"))
    args = parser.parse_args()

    try:
        import pandas as pd
        import joblib
    except ImportError as e:
        print(f"Required: pip install pandas pyarrow. {e}", file=sys.stderr)
        return 1

    try:
        from prophet import Prophet
    except ImportError:
        print("Required: pip install prophet. See scripts/requirements-training.txt.", file=sys.stderr)
        return 1

    if args.input_dataset:
        print("--input-dataset: use Azure ML Job with DatasetConsumptionConfig; --input-path used here", file=sys.stderr)

    df = pd.read_parquet(args.input_path)
    if df.empty:
        print("Input is empty.", file=sys.stderr)
        return 1

    date_col = args.date_col
    if not date_col:
        for c in DATE_COLS:
            if c in df.columns:
                date_col = c
                break
    if not date_col or date_col not in df.columns:
        print(f"Missing date column. Use --date-col or provide one of: {DATE_COLS}", file=sys.stderr)
        return 1

    value_col = args.value_col
    if not value_col:
        for c in VALUE_COLS:
            if c in df.columns:
                value_col = c
                break
    if not value_col or value_col not in df.columns:
        print(f"Missing value column. Use --value-col or provide one of: {VALUE_COLS}", file=sys.stderr)
        return 1

    if args.tenant_id and "tenantId" in df.columns:
        df = df[df["tenantId"] == args.tenant_id]
    if df.empty:
        print("No rows after tenant filter.", file=sys.stderr)
        return 1

    # Aggregate by date if multiple rows per date (e.g. from opportunity-level data)
    g = df.groupby(date_col, as_index=False)[value_col].sum()
    g = g.rename(columns={date_col: "ds", value_col: "y"})
    g["ds"] = pd.to_datetime(g["ds"])
    g = g.dropna(subset=["y"]).sort_values("ds")
    if len(g) < 2:
        print("Need at least 2 (date, value) rows after aggregate.", file=sys.stderr)
        return 1

    yearly = args.param_yearly_seasonality == "true" if args.param_yearly_seasonality != "auto" else "auto"
    weekly = args.param_weekly_seasonality == "true" if args.param_weekly_seasonality != "auto" else "auto"
    m = Prophet(
        interval_width=args.param_interval_width,
        yearly_seasonality=yearly,
        weekly_seasonality=weekly,
    )
    m.fit(g)

    artifact = {
        "model": m,
        "interval_width": args.param_interval_width,
        "periods_default": args.param_periods,
    }
    joblib.dump(artifact, "model.joblib")

    # Register to Azure ML when AZURE_ML_* / ML_* env set (Plan §877, §5.6)
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
                    conda_path = os.path.join(script_dir, "conda-prophet.yaml")
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
                            scoring_script="score_prophet_forecast.py",
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
