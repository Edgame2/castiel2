# BI Sales Risk Rollout — Plan §984

Phased rollout: beta tenants, 25/50/100%; feature flags and monitoring.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §8.4, §984.

---

## 1. Beta tenants

- **Selection:** Choose a small set of tenants (e.g. 2–5) for beta. Criteria: representative data volume, willing to give feedback, non‑critical if issues occur.
- **Config:**  
  - **Option A:** `rollout.beta_tenant_ids: [ "tenant-a", "tenant-b" ]` in risk-analytics (or a shared config). Service checks `X-Tenant-ID` against this list to enable BI/risk features for beta only.  
  - **Option B:** **configuration-service** per-tenant overrides (Plan §8.4): set `feature_flags.*` or a `rollout.beta: true` for beta tenants. risk-analytics, ml-service read from configuration-service when present.
- **Scope:** Beta gets full BI/risk (risk evaluation, win-prob, early warning, dashboards, etc.) while others stay off or on a subset. Use feature flags to narrow if needed.

---

## 2. 25 / 50 / 100% phases

- **25%:** After beta validates, enable BI/risk for 25% of the tenant population (e.g. first quartile of a sorted tenant list, or 25% of active tenants).  
- **50%:** If error rate and latency (Plan §8.5.2, §11.7) are OK, enable for 50%.  
- **100%:** Full rollout.

**Mechanics:**  
- **Tenant list:** From configuration-service, tenant registry, or config. No hardcoded IDs.  
- **Percentage:** Compute which tenants are “in” (e.g. `index % 4 === 0` for 25%, or an explicit `rollout.percentage` / `rollout.tenant_ids`).  
- **Where:** Centralized in configuration-service, or in risk-analytics (and optionally ml-service) via `rollout.percentage` and `rollout.tenant_ids` from config.  
- **Override:** Beta tenants can stay on regardless of percentage; or fold them into the 25/50/100 logic.

---

## 3. Feature flags

- **Existing (Plan §8.1):** risk-analytics `feature_flags`: `early_warning_lstm`, `industry_models`, `competitive_intelligence`, `anomaly_detection`, `prescriptive_remediation`, `executive_dashboards`, `hitl_approvals`. ml-service: `azure_ml` and feature toggles as needed.
- **Per-tenant (Plan §8.4):** configuration-service holds overrides. Containers read: if tenant override exists, use it; else `config/default.yaml`.
- **Rollout use:**  
  - For **beta:** Enable full feature set for `rollout.beta_tenant_ids` (or `rollout.beta: true` in configuration-service).  
  - For **25/50/100%:** Either (a) enable all BI/risk flags for “in” tenants, or (b) use a single `rollout.bi_risk_enabled` (or similar) that gates the whole BI/risk surface; granular flags stay as-is for already-on tenants.
- **Config:** All from `config/default.yaml` or configuration-service; env overrides (e.g. `ROLLOUT_PERCENTAGE`) where applicable. No hardcoded tenant IDs in code.

---

## 4. Monitoring during rollout

- **Prometheus / Grafana:** [README](../README.md) – [bi-risk-overview.json](../grafana/dashboards/bi-risk-overview.json), [ml-service.json](../grafana/dashboards/ml-service.json), [batch-jobs.json](../grafana/dashboards/batch-jobs.json). Watch `http_request_duration_seconds`, `ml_prediction_duration_seconds_bucket`, `risk_evaluations_total`, error rate by route.
- **Application Insights:** Trace and exception logging; correlate with `tenantId` when present.
- **Alerts:** On error rate or p95 latency (e.g. &gt; 500 ms for ML) increase during a phase; consider pausing or rolling back the percentage.
- **TenantId:** Include in logs and, where supported, as a metric label so per-tenant issues are visible.

---

## 5. Rollback

- **Reduce percentage:** Lower `rollout.percentage` or remove tenants from `rollout.tenant_ids`; redeploy or refresh config.  
- **Feature flags:** Turn off specific flags (e.g. `early_warning_lstm`) for affected tenants via configuration-service.  
- **Beta only:** Set `rollout.beta_tenant_ids: []` or disable `rollout.beta` for affected tenants to revert to pre–BI/risk.

---

## 6. Config (when implemented)

Example; values from config or configuration-service:

```yaml
# risk-analytics (or shared rollout config)
rollout:
  beta_tenant_ids: ${ROLLOUT_BETA_TENANT_IDS:-[]}   # e.g. ["t1","t2"]
  percentage: ${ROLLOUT_PERCENTAGE:-100}            # 25, 50, 100
  tenant_ids: ${ROLLOUT_TENANT_IDS:-[]}             # optional: explicit list; if empty, derive from registry
```

---

## 7. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §8.1, §8.4, §984
- [deployment/monitoring/README.md](../README.md) – dashboards, metrics
- [validation.md](validation.md) – KPIs, UAT scenarios and pass criteria during rollout
