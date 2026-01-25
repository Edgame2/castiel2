# BI Sales Risk Implementation Plan – Additional Recommendations

**Goal:** Make the system the **best-in-class BI Sales Risk analysis** platform.  
**Scope:** Phases 1–2 where possible; some items for Phase 3+.

---

## 1. Outcome Feedback Loop (Critical for Model Quality)

**What:** When opportunities close (IsClosed + IsWon or StageName = Closed Won / Closed Lost), feed **actual outcome** into ML so win-probability and risk models improve over time.

**Add:**
- **Event:** `opportunity.outcome.recorded` — published by risk-analytics or a sync job when opportunity becomes Closed Won/Lost. Payload: `tenantId`, `opportunityId`, `outcome` (won|lost), `competitorId` (if loss), `closeDate`, `amount`.
- **Consumer (risk-analytics):** `RiskAnalyticsEventConsumer` → `OutcomeDataLakeWriter` appends to Data Lake `/ml_outcomes/...` for retraining (DATA_LAKE_LAYOUT §2.2). Optionally append to `ml_win_probability_predictions` or `ml_outcomes` Cosmos for join by opportunityId+predictionDate.
- **Batch job:** `outcome-sync` (e.g. daily): query shards for recently closed opportunities, publish `opportunity.outcome.recorded` or write to Data Lake. Enables periodic retraining of win-probability and risk-scoring.

**Phase:** 1 (event + consumer); 2 (batch retrain pipeline that uses outcome-enriched data).

---

## 2. Explainability (Trust & Actionability)

**What:** Every risk score and win-probability should expose **top drivers** (“why this score”) so users trust and act.

**Add:**
- **risk.evaluated payload:** include `topDrivers: { feature: string, contribution: number, direction: 'increases'|'decreases' }[]` (from SHAP, tree feature importance, or rule hits). Same for `risk.prediction.generated` (LSTM: attention or last-layer weights).
- **ml.prediction.completed / win-probability:** `topDrivers` in response. Azure ML: many tree models can return `feature_importances_`; wrap in training script and return from endpoint. For LSTM, use attention or surrogate (e.g. LIME on last hidden state).
- **API:** `GET /api/v1/opportunities/:id/risk-explainability` and `.../win-probability/explain` returning `{ score, topDrivers, modelId, modelVersion }`.
- **UI:** `ExplainabilityCard` on OpportunityRiskPage and next to WinProbabilityGauge: “Top 5 factors: 1. Stage stagnation (+0.12), 2. Days since activity (+0.08), …”.

**Phase:** 1 for risk and win-prob (even with rule-based or simple tree importance); 2 for LSTM explainability if needed.

---

## 3. Model Monitoring & Drift (MLOps)

**What:** Detect **data drift** and **model performance decay** so we retrain or roll back before quality degrades.

**Add:**
- **Feature log at inference:** For each `risk.evaluated` and `ml.prediction.completed`, log **feature vector** (or hash) and **timestamp** to Data Lake (e.g. `/ml_inference_logs/year=.../month=.../`) or a compact Cosmos container `ml_inference_logs`. Enables drift vs training distribution.
- **Batch job:** `model-monitoring` (weekly): compute basic drift (e.g. KL or PSI on key features) and performance (Brier on win-prob, MAE on risk if outcomes available). Publish `ml.model.drift.detected` or `ml.model.performance.degraded`; notify or alert.
- **Config:** `model_monitoring.psi_threshold`, `model_monitoring.min_samples`; feature list for drift.
- **Runbook:** On `ml.model.performance.degraded`: run shadow vs new model, then rollback or retrain.

**Phase:** 2 (feature logging can start in 1; drift job and alerts in 2).

---

## 4. Sales-Specific Leading Indicators (Domain Depth)

**What:** Go beyond generic “days since activity” with **sales-best-practice** signals.

**Add to leading indicators (and to BI_SALES_RISK_SHARD_SCHEMAS / feature pipeline):**
- **Champion strength:** Binary or level (none / weak / strong) from contact roles: is there a clear “champion” (or executive sponsor) and has they been active recently? Create if not in shards.
- **Buying committee coverage:** % of roles covered (economic, technical, user, coach) from `c_contact.role`. Drives “missing stakeholder” risk.
- **Stage velocity vs expected:** Expected time-in-stage by stage and industry (from benchmarks or historical median). Flag “stage stagnation” when actual > expected (e.g. p75). Plan has stage stagnation; this ties it to **benchmarks**.
- **Deal velocity:** Expected cycle time (e.g. from first touch to close) by segment; “deals older than expected” as a leading indicator.

**Phase:** 1 for champion and buying-committee if `c_contact.role` exists; 2 for velocity vs expected (needs benchmark or history).

---

## 5. Prioritization & “Recommended Actions Today”

**What:** Manager dashboard should answer “**what should I do first?**” — not just lists of risks.

**Add:**
- **API:** `GET /api/v1/dashboards/manager/prioritized` or extend manager dashboard: `prioritizedOpportunities: { opportunityId, rank, revenueAtRisk, riskScore, earlyWarningSeverity, suggestedAction, reason }[]`. Rank by `revenueAtRisk * riskScore * earlyWarningMultiplier` (or similar); cap at 10–20.
- **Suggested action:** From mitigation-ranking or rules: “Schedule exec meeting”, “Re-engage champion”, “Address competitor X”. One per opportunity for the card.
- **UI:** “Recommended for you today” block at top of ManagerDashboard; each row clickable to opportunity. Optional: “Snooze” or “Not relevant” to tune (store in `risk_warnings` or user prefs).

**Phase:** 2 (needs mitigation-ranking and early-warning; can stub in Phase 1 with rule-based “review” action).

---

## 6. Data Quality & “Model-Ready” Signal

**What:** ML and risk quality depend on **data completeness**. Expose a **model-ready** or **data-quality** level per opportunity so users and models know when to trust.

**Add:**
- **Risk evaluation and APIs:** `dataQuality: { score 0–1, completenessPct, missingCritical: string[], stalenessDays }`. Critical = e.g. Amount, StageName, CloseDate, LastActivityDate, at least one contact. Staleness = max days since any key field or related activity updated.
- **Trust level / explainability:** Existing “trust-level” and “explainability” routes: feed from `dataQuality` and `modelId` (e.g. industry vs global). Low completeness → lower confidence or fallback to rules.
- **Dashboard:** Data quality panel or badge on opportunity list: “% pipeline model-ready”. Drives data hygiene.

**Phase:** 1 (completeness + staleness in RiskEvaluationService); 2 (dashboard and “model-ready” filter).

---

## 7. SLOs, Runbooks, and Operational Readiness

**What:** Treat risk and ML as **production-critical**: define SLOs, runbooks, and health checks.

**Add:**
- **SLOs (document in runbook or ADR):** e.g. `GET /opportunities/:id/risk-predictions` p95 &lt; 500 ms; `POST /risk/evaluations` p95 &lt; 2 s; `risk.evaluated` consumer write to Cosmos p99 &lt; 5 s. Batch jobs: `risk-snapshot-backfill` and `risk-clustering` complete within 2× typical runtime or alert.
- **Health:** risk-analytics and ml-service `/health` to include: Cosmos reachable, RabbitMQ reachable, **Azure ML endpoints reachable** (one GET per critical model), **last successful batch job** (e.g. `risk-snapshot-backfill`) timestamp. If a model endpoint is down, degrade (fallback to rules) and alert.
- **Runbooks:** (1) **Model rollback:** switch `azure_ml.endpoints[modelId]` to previous version and deploy; (2) **Data Lake / backfill failure:** retry, then manual partition; (3) **Spike in risk.evaluated errors:** scale consumers, check ML throttling.

**Phase:** 1 for health (endpoints + last batch); 2 for SLO monitoring and runbooks.

---

## 8. Win/Loss Reasons and Competitive Learning

**What:** Close the loop on **why** we won or lost — not just “competitor X”. Improves competitor and risk models.

**Add:**
- **Shard or Cosmos:** `c_opportunity` or a `win_loss_reasons` container: `lossReason` (e.g. “Price”, “Competitor X”, “No champion”, “Timing”), `winReason`, `competitorId` (if loss). Populated by CRM, integration, or post-close survey/LLM summary.
- **CompetitiveIntelligenceService:** Ingest `lossReason`/`winReason`; link to `competitors` and `risk_competitor_tracking`. Win/loss analysis: “When we lose to X, top reasons: Price 40%, Product gap 30%.”
- **Training:** Use `lossReason`/`winReason` as extra features or labels for win-probability and mitigation-ranking (e.g. “Recommend price objection playbook when competitor X and deal size > $Y”).

**Phase:** 2 (schema + integration); Phase 3 for ML use.

---

## 9. Lightweight Model Cards and Segment Fairness (Governance Lite)

**What:** Even in Phase 1–2, document **what** each model does and check **segment fairness** at deploy to avoid silent bias.

**Add:**
- **Model card (lite):** In `ml_models` or a `model_cards` container / markdown in repo: purpose, input schema, output, known limitations, training date, and “when to use” (e.g. industry vs global). Expose via `GET /api/v1/models/:id/card` or in admin UI.
- **Segment fairness (Phase 2):** At deploy or in `model-monitoring` job: for win-probability and risk-scoring, compare metric (Brier, MAE, or calibration) across segments (e.g. industry, region, deal size band). If delta &gt; threshold, alert and document. No auto-rollback; human decision.

**Phase:** 1 for model card lite; 2 for segment checks.

---

## 10. Quick Actions and One-Click Remediation

**What:** Reduce friction from “see risk” to “do something” — one-click to create a task, log an activity, or start a remediation workflow.

**Add:**
- **API:** `POST /api/v1/opportunities/:id/quick-actions` body `{ action: 'create_task'|'log_activity'|'start_remediation', payload? }`. For `start_remediation`, call `RemediationWorkflowService.createWorkflow` with recommended actions. For `create_task`/`log_activity`, either call integration-manager/CRM adapter or write to a queue for async sync.
- **UI:** On EarlyWarningCard and AnomalyCard: “Create task”, “Start remediation”, “Log call” (or “Mark as discussed”). Prefill from risk and recommended action.

**Phase:** 2 (after remediation and, if needed, CRM adapter).

---

## 11. At-Risk Reason Taxonomy (Structured Root Causes)

**What:** Beyond six risk categories, tag **why** a deal is at risk (e.g. “No executive sponsor”, “Competitor mentioned”, “Silence”, “Discount pressure”) so mitigation and analytics are more precise.

**Add:**
- **Schema:** `risk_evaluations` or `risk_snapshots`: `atRiskReasons: string[]` from a controlled list (config or DB). Populated by rules + LLM (or existing risk catalog) and by mitigation-ranking output.
- **Mitigation-ranking:** Map `atRiskReasons` to recommended playbooks. E.g. “No executive sponsor” → “Schedule exec alignment meeting”.
- **Analytics:** “Top at-risk reasons this month” in manager/executive dashboard; filter opportunities by `atRiskReasons`.

**Phase:** 2 (taxonomy + rules/LLM; mitigation already in plan).

---

## 12. Peer Deal Comparison (“Similar Won Deals”)

**What:** “Deals like this one tend to win X% of the time and close in Y days” — improves forecasting and gives reps a benchmark.

**Add:**
- **API:** `GET /api/v1/opportunities/:id/similar-won-deals` or `benchmark-comparison` extension: similar by stage, industry, size band (and optionally region). Return: `{ count, winRate, medianCycleTime, p25CloseAmount }`. Use Cosmos or batch precomputed in `industry_benchmarks` / `portfolio_aggregates`.
- **UI:** On opportunity detail or benchmark panel: “Similar won deals: 67% win rate, 42-day median cycle.”

**Phase:** 2 (needs benchmarks or similarity logic); can stub with industry-only in Phase 1.

---

## Summary: What to Integrate into the Plan

| # | Recommendation | Prefer in Phase | Integrate as |
|---|----------------|-----------------|--------------|
| 1 | Outcome feedback loop | 1 (event+consumer); 2 (retrain) | New event `opportunity.outcome.recorded`; consumer; `outcome-sync` job; Data Lake for retrain |
| 2 | Explainability (top drivers) | 1 (risk/win-prob); 2 (LSTM) | `topDrivers` in risk/win-prob API and events; `ExplainabilityCard` in UI |
| 3 | Model monitoring & drift | 2 | Feature logging at inference; `model-monitoring` job; `ml.model.drift.detected`; runbook |
| 4 | Sales-specific leading indicators | 1 (champion, coverage); 2 (velocity vs expected) | Extend feature pipeline and BI_SALES_RISK_SHARD_SCHEMAS |
| 5 | Prioritized “Recommended today” | 2 | `GET /dashboards/manager/prioritized` or extension; Manager UI block |
| 6 | Data quality & model-ready | 1 | `dataQuality` in evaluation and APIs; trust-level wiring |
| 7 | SLOs, runbooks, health | 1 (health); 2 (SLOs, runbooks) | Health: endpoints + last batch; doc SLOs and runbooks |
| 8 | Win/loss reasons | 2 | `lossReason`/`winReason` schema; CompetitiveIntelligenceService |
| 9 | Model cards & segment fairness | 1 (card); 2 (fairness) | `model_cards` or `GET /models/:id/card`; segment check in monitoring |
| 10 | Quick actions | 2 | `POST /opportunities/:id/quick-actions`; UI on risk/anomaly cards |
| 11 | At-risk reason taxonomy | 2 | `atRiskReasons` in risk docs; mitigation mapping |
| 12 | Peer deal comparison | 2 | `GET /opportunities/:id/similar-won-deals` or extend benchmark-comparison |

---

**Next step:** Copy the chosen items into **BI_SALES_RISK_IMPLEMENTATION_PLAN.md** as a new **§11 Additional Recommendations (Best-in-Class)** and, where applicable, add concrete tasks to the Phase 1–2 breakdown.
