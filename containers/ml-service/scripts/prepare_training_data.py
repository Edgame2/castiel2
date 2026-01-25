#!/usr/bin/env python3
"""
prepare_training_data.py – BI Sales Risk (DATA_LAKE_LAYOUT §2.4; TRAINING_SCRIPTS_SPEC §2.1).

Joins /risk_evaluations and /ml_outcomes from Data Lake (or local) and writes
/ml_training/{model_id}/... Parquet. Replaces the TBD "pipeline job" in DATA_LAKE_LAYOUT §2.4.

Modes:
- outcome_joined: base join + target_win, target_risk, is_closed. For downstream enrichment
  (buildFeatureVector or shard-manager) before train_risk_scoring / train_win_probability.
- risk_scoring | win_probability: same join + placeholder feature columns so train_risk_scoring.py
  and train_win_probability.py can consume the file. For production models you must enrich with
  shard-manager or Node buildFeatureVector first; use generate_synthetic_opportunities.py when
  real enriched data is insufficient.

Paths: abfs:// (needs adlfs) or file:// or local. Reads directories or globs of Parquet.
Deps: pandas, pyarrow. Optional: adlfs for abfs://.
"""

import argparse
import os
import sys

# Placeholder feature values when enrichment (shard-manager/buildFeatureVector) not run.
# train_* require these columns; models trained on placeholders are for pipeline testing only.
_PLACEHOLDER = {
    "probability": 0.5,
    "days_to_close": 0,
    "stage_encoded": 0,
    "industry_encoded": 0,
    "days_since_last_activity": 999,
    "activity_count_30d": 0,
    "stakeholder_count": 0,
}


def _read_parquet(path: str):
    import pandas as pd

    # abfs:// needs adlfs; try fsspec-style. pd.read_parquet supports fsspec if installed.
    if path.startswith("abfs://") or path.startswith("abfss://"):
        try:
            import adlfs
            fs = adlfs.AzureBlobFileSystem()
            return pd.read_parquet(path, filesystem=fs)
        except ImportError:
            print("For abfs:// install: pip install adlfs", file=sys.stderr)
            raise
    return pd.read_parquet(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Join risk_evaluations + ml_outcomes → /ml_training/{model_id}/ (DATA_LAKE_LAYOUT §2.4)"
    )
    parser.add_argument("--risk-evaluations-path", required=True, help="Path to risk_evaluations Parquet (file, dir, or glob)")
    parser.add_argument("--ml-outcomes-path", required=True, help="Path to ml_outcomes Parquet (file, dir, or glob)")
    parser.add_argument("--output-path", required=True, help="Output Parquet path or directory (e.g. /ml_training/risk_scoring/out.parquet)")
    parser.add_argument(
        "--model-id",
        choices=("outcome_joined", "risk_scoring", "win_probability"),
        default="outcome_joined",
        help="outcome_joined=base+targets; risk_scoring|win_probability=+placeholder features for train_*",
    )
    parser.add_argument("--tenant-id", default=None, help="Optional tenant filter")
    parser.add_argument("--partition-date", default=None, help="Optional partition as YYYY-MM-DD for path (not written into data)")
    args = parser.parse_args()

    try:
        import pandas as pd
        import numpy as np
    except ImportError as e:
        print(f"Required: pip install pandas pyarrow. {e}", file=sys.stderr)
        return 1

    # Load
    try:
        rev = _read_parquet(args.risk_evaluations_path)
        out = _read_parquet(args.ml_outcomes_path)
    except Exception as e:
        print(f"Failed to read Parquet: {e}", file=sys.stderr)
        return 1

    if rev.empty:
        print("risk_evaluations is empty.", file=sys.stderr)
        return 1

    # Normalize join keys
    for c in ("tenantId", "opportunityId"):
        if c not in rev.columns:
            print(f"risk_evaluations missing: {c}", file=sys.stderr)
            return 1
    if "opportunityId" not in out.columns:
        print("ml_outcomes missing: opportunityId", file=sys.stderr)
        return 1
    if "tenantId" not in out.columns:
        out["tenantId"] = rev["tenantId"].iloc[0] if "tenantId" in rev.columns and len(rev) else ""

    # Left join on (tenantId, opportunityId); ml_outcomes may have dupes, take first
    out_dedup = out.drop_duplicates(subset=["tenantId", "opportunityId"], keep="first")
    merged = rev.merge(
        out_dedup,
        on=["tenantId", "opportunityId"],
        how="left",
        suffixes=("", "_out"),
    )
    # If we had _out dupes, prefer non-_out
    for c in list(merged.columns):
        if c.endswith("_out"):
            merged = merged.drop(columns=[c])

    # Targets and is_closed
    merged["target_win"] = np.where(
        merged.get("outcome", pd.Series(dtype=object)) == "won",
        1,
        np.where(merged.get("outcome", pd.Series(dtype=object)) == "lost", 0, np.nan),
    )
    # target_risk: riskScore (clip) if present; else outcome lost=1 won=0; else nan
    risk = merged.get("riskScore", pd.Series(dtype=float))
    merged["target_risk"] = risk.clip(0, 1)
    out_col = merged.get("outcome", pd.Series(dtype=object))
    merged["target_risk"] = np.where(
        merged["target_risk"].notna(),
        merged["target_risk"],
        np.where(out_col == "lost", 1.0, np.where(out_col == "won", 0.0, np.nan)),
    )
    merged["is_closed"] = np.where(merged.get("outcome", pd.Series(dtype=object)).notna(), 1, 0)

    if args.tenant_id and "tenantId" in merged.columns:
        merged = merged[merged["tenantId"] == args.tenant_id]

    if args.model_id == "outcome_joined":
        # Keep base columns + targets, is_closed. Drop any duplicate-named from merge.
        keep = [
            "tenantId", "opportunityId", "riskScore", "categoryScores", "timestamp",
            "outcome", "amount", "closeDate", "recordedAt", "target_risk", "target_win", "is_closed",
        ]
        if "evaluationId" in merged.columns:
            keep.insert(keep.index("timestamp") + 1, "evaluationId")
        for c in keep:
            if c not in merged.columns and c != "evaluationId":
                merged[c] = np.nan
        out_df = merged[[c for c in keep if c in merged.columns]]
    elif args.model_id == "risk_scoring":
        # Drop rows without target_risk
        merged = merged.dropna(subset=["target_risk"])
        if merged.empty:
            print("No rows with target_risk after join.", file=sys.stderr)
            return 1
        for k, v in _PLACEHOLDER.items():
            merged[k] = v
        merged["amount"] = merged["amount"].fillna(0) if "amount" in merged.columns else 0
        merged["risk_score_latest"] = merged["riskScore"].fillna(0.5) if "riskScore" in merged.columns else 0.5
        req = ["amount", "probability", "days_to_close", "stage_encoded", "industry_encoded",
               "days_since_last_activity", "activity_count_30d", "stakeholder_count", "target_risk"]
        out_df = merged[["tenantId", "opportunityId"] + req + ["risk_score_latest"]]
    else:  # win_probability
        merged = merged[merged["is_closed"] == 1].dropna(subset=["target_win"])
        if merged.empty:
            print("No closed rows with target_win after join.", file=sys.stderr)
            return 1
        for k, v in _PLACEHOLDER.items():
            merged[k] = v
        merged["amount"] = merged["amount"].fillna(0) if "amount" in merged.columns else 0
        req = ["amount", "probability", "days_to_close", "stage_encoded", "industry_encoded",
               "days_since_last_activity", "activity_count_30d", "stakeholder_count", "target_win", "is_closed"]
        out_df = merged[["tenantId", "opportunityId"] + req]

    # Write
    p = args.output_path
    if args.partition_date and os.path.isdir(os.path.dirname(p) or "."):
        # If output-path is a dir, write to output-path/date=YYYY-MM-DD/file.parquet
        base = p.rstrip("/")
        if not base.endswith(".parquet"):
            base = os.path.join(base, f"date={args.partition_date}", "data.parquet")
        else:
            base = os.path.join(os.path.dirname(base), f"date={args.partition_date}", os.path.basename(base))
        p = base
    d = os.path.dirname(p)
    if d:
        os.makedirs(d, exist_ok=True)
    out_df.to_parquet(p, index=False)
    print(f"Wrote {len(out_df)} rows to {p} (model_id={args.model_id})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
