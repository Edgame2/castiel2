# Deep Learning / RL / Causal (Optional) — Plan §961

**If in scope:** DNN/LSTM for sequences, RL (DQN) for strategy, DoWhy for causal; new Azure ML training and endpoints; integrate into risk/win-prob/recommendations.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §961. **Optional:** implement only when product/ops confirm scope.

---

## 1. DNN / LSTM for sequences

- **Beyond current:** risk-trajectory-lstm ([ml-training-jobs.md](ml-training-jobs.md)) already uses LSTM. This item covers **additional** sequence models: e.g. deeper LSTM, Transformer, or DNN for other tasks (next-step prediction, sequence embedding, multi-horizon risk).
- **Training:** New scripts (e.g. `train_dnn_sequence.py`, `train_transformer_risk.py`) in `containers/ml-service/scripts/`; Azure ML job YAML; input from Data Lake (`/risk_evaluations`, `risk_snapshots`-derived, or `/ml_outcomes`). Log metrics to Azure ML run.
- **Deploy:** New endpoint in ml-service `config.azure_ml.endpoints` (e.g. `dnn_sequence`, `transformer_risk`); no hardcoded URLs. ml-service `AzureMLClient` or dedicated inferencer calls it.
- **Integration:** ml-service (inference); risk-analytics calls ml-service for risk trajectory, early-warning, or an alternate risk-scoring path when feature flag or config enables it. Fallback to existing LSTM or rules if not configured.

---

## 2. RL (DQN) for strategy

- **Purpose:** Recommend which action to take (e.g. remediation type, touch cadence, next best action) to improve win probability or reduce risk. DQN or similar: state = opportunity/account context, action = discrete choices, reward = outcome (won/lost) or risk delta.
- **Training:** New script (e.g. `train_dqn_strategy.py`); reward from `/ml_outcomes` or closed opportunities. Azure ML job; may require simulated or historical trajectories.
- **Deploy:** New endpoint in `azure_ml.endpoints` (e.g. `rl_strategy`); config-driven.
- **Integration:** **recommendations** container: MitigationRankingService or a new `StrategyRLService` calls the endpoint to get recommended action; wire into `GET /api/v1/opportunities/:id/mitigation-actions` or a new route. risk-analytics may call for “suggested next step” in early-warning or prioritization.

---

## 3. DoWhy for causal

- **Purpose:** Causal inference, e.g. effect of stage change on win probability, effect of competitor mention on loss, effect of touch frequency on conversion. DoWhy or EconML.
- **Execution:** Typically **batch** (not per-request): run on historical data in Data Lake or Cosmos; output summary (treatment effect, confidence) to Cosmos or a report. Optional: schedule via `workflow.job.trigger` (e.g. `causal-analysis`) or on-demand.
- **API (TBD):** If exposed: e.g. `GET /api/v1/causal/effects` or `GET /api/v1/analytics/causal?treatment=...&outcome=...` in ml-service or risk-analytics; config-driven. If batch-only, no real-time route.
- **Integration:** risk-analytics (insights, explainability) or reporting; recommendations (which levers have causal impact).

---

## 4. Cross-cutting

- **Config:** All Azure ML endpoints in `config.azure_ml.endpoints`; URLs from config or env (e.g. `AZURE_ML_ENDPOINT_DNN_SEQUENCE`). No hardcoded ports or URLs.
- **Feature flags:** Optional `feature_flags.dnn_sequence`, `feature_flags.rl_strategy`, `feature_flags.causal_analysis` to gate rollout; per-tenant overrides via configuration-service when present.
- **TenantId:** Include in all calls and payloads; `opportunityId` = c_opportunity shard id.
- **Runbooks:** New Azure ML jobs follow [ml-training-jobs.md](ml-training-jobs.md) pattern (submit, data paths, deploy). Add job specs to that runbook or a separate `azml-job-*` when implemented.

---

## 5. When to implement

- **Trigger:** Product/ops confirm “in scope” for Phase 3 or a later phase. Until then, **do not implement**; existing LSTM, rules, and classical ML remain.
- **Order (suggested):** (1) DNN/LSTM if sequence modelling is the priority; (2) DoWhy for causal if insights/explainability are the priority; (3) RL if strategy/recommendation is the priority.

---

## 6. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §961
- [ml-training-jobs.md](ml-training-jobs.md) – Azure ML job pattern, data sources, deploy
- [model-monitoring.md](model-monitoring.md) – drift/performance for new endpoints when deployed
- [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](../../../documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md)
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md)
