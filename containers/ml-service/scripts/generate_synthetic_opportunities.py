#!/usr/bin/env python3
"""
generate_synthetic_opportunities.py – BI Sales Risk (Plan §5.6; TRAINING_SCRIPTS_SPEC §3.6).

Domain rules synthetic data for risk-scoring and win-probability when real data < 3k/5k.
Output: Parquet to /ml_training/synthetic/risk_scoring/ or --output-path. Consumable by
train_risk_scoring.py, train_win_probability.py. Columns: amount, probability, days_to_close,
stage_encoded, industry_encoded, days_since_last_activity, activity_count_30d, stakeholder_count,
is_closed, is_won, target_risk, target_win (+ optional days_in_stage, competitor_count, etc.).
Deps: numpy, pandas, pyarrow.
"""

import argparse
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate synthetic opportunities for risk-scoring / win-probability (Plan §5.6; TRAINING_SCRIPTS_SPEC §3.6)"
    )
    parser.add_argument("--output-path", default=None, help="Output Parquet path (default: ./ml_training/synthetic/risk_scoring/synthetic.parquet)")
    parser.add_argument("--n-samples", type=int, default=5000, help="Number of synthetic rows")
    parser.add_argument("--tenant-id", default=None, help="Optional tenantId to tag rows")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--pct-closed", type=float, default=0.7, help="Fraction with is_closed=1 (for target_win)")
    args = parser.parse_args()

    try:
        import numpy as np
        import pandas as pd
    except ImportError as e:
        print(f"Required: pip install numpy pandas pyarrow. {e}", file=sys.stderr)
        return 1

    rng = np.random.default_rng(args.seed)
    n = args.n_samples

    # Domain rules (TRAINING_SCRIPTS_SPEC §3.6): amount log-normal, probability beta, stage categorical,
    # target_risk = f(probability, days_since_activity)
    amount = rng.lognormal(mean=10.5, sigma=1.2).clip(1, 10_000_000)
    probability = (rng.beta(2, 2, n) * 100).clip(5, 95)
    days_to_close = rng.integers(1, 181, n)
    stage_encoded = rng.integers(0, 5, n)
    industry_encoded = rng.integers(0, 10, n)
    days_since_last_activity = rng.integers(0, 46, n)
    activity_count_30d = rng.integers(0, 26, n)
    stakeholder_count = rng.integers(1, 11, n)
    days_in_stage = rng.integers(0, 61, n)
    days_since_created = rng.integers(1, days_to_close + 1, n)
    competitor_count = rng.integers(0, 6, n)
    stage_stagnation_days = rng.integers(0, 31, n)
    risk_score_latest = rng.uniform(0, 1, n)
    risk_velocity = rng.uniform(-0.3, 0.3, n)
    risk_acceleration = rng.uniform(-0.1, 0.1, n)

    # target_risk = f(probability, days_since_activity) + noise
    base = 0.35 * (1 - probability / 100) + 0.25 * (days_since_last_activity / 45) + 0.15 * (1 - np.minimum(activity_count_30d, 20) / 20)
    target_risk = (base + 0.25 * rng.uniform(0, 1, n)).clip(0, 1)

    is_closed = (rng.uniform(0, 1, n) < args.pct_closed).astype(int)
    # is_won only when is_closed=1; higher probability -> more likely won
    is_won = np.where(is_closed == 1, (rng.uniform(0, 1, n) < (probability / 100 + 0.1)).astype(int), 0)
    target_win = np.where(is_closed == 1, is_won, np.nan)

    df = pd.DataFrame({
        "amount": amount,
        "probability": probability,
        "days_to_close": days_to_close,
        "stage_encoded": stage_encoded,
        "industry_encoded": industry_encoded,
        "days_since_last_activity": days_since_last_activity,
        "activity_count_30d": activity_count_30d,
        "stakeholder_count": stakeholder_count,
        "days_in_stage": days_in_stage,
        "days_since_created": days_since_created,
        "competitor_count": competitor_count,
        "stage_stagnation_days": stage_stagnation_days,
        "risk_score_latest": risk_score_latest,
        "risk_velocity": risk_velocity,
        "risk_acceleration": risk_acceleration,
        "is_closed": is_closed,
        "is_won": is_won,
        "target_risk": target_risk,
        "target_win": target_win,
    })
    if args.tenant_id:
        df["tenantId"] = args.tenant_id

    out = args.output_path
    if not out:
        out = os.path.join(os.getcwd(), "ml_training", "synthetic", "risk_scoring", "synthetic.parquet")
    d = os.path.dirname(out)
    if d:
        os.makedirs(d, exist_ok=True)
    df.to_parquet(out, index=False)
    print(f"Wrote {len(df)} rows to {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
