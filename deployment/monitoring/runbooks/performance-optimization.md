# Performance Optimization — Plan §978

When win-probability or risk-scoring p95 ≥ 500 ms: ONNX/Redis as an optimization. Scale-to-zero and cost tuning for Azure ML.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §11.7, §978 and [BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md) §2.5.

**SLO (Plan §11.7):** risk-predictions p95 &lt; 500 ms. **Metric:** `ml_prediction_duration_seconds_bucket{model="..."}` (Prometheus). **Dashboard:** [ml-service.json](../grafana/dashboards/ml-service.json) (p95 panel, 500 ms threshold). **See:** [README §SLOs](../README.md).

---

## 1. When to consider ONNX/Redis

- **Trigger:** p95 for **win-probability** or **risk-scoring** (Azure ML real-time) &gt;= 500 ms over a sustained window (e.g. 7 days in Grafana `ml-service.json`).
- **Scope:** Only these latency-critical models. LSTM, forecasting, anomaly, clustering stay on Azure ML (batch or real-time as today).
- **Default:** Azure ML Managed Endpoints only. ONNX/Redis is a **Phase 4 optimization**; add only if the SLO is not met.

---

## 2. ONNX path

1. **Export:** Convert XGBoost / scikit-learn (win-prob, risk-scoring) to ONNX in the training pipeline (e.g. `skl2onnx`, `onnxmltools`) or from a saved Azure ML model. Store ONNX in Blob or in-repo; version with the model.
2. **Serve:**  
   - **Option A:** ml-service (or a sidecar) loads ONNX; `onnxruntime-node` (or `onnxruntime`) runs inference in-process. Config: `onnx.enabled`, `onnx.model_path` (or URL from config; no hardcoded paths).  
   - **Option B:** Separate ONNX serving service; ml-service calls it via `services.onnx_serving.url` from config.
3. **Flow:** ml-service `PredictionService` / risk-scoring: if `onnx.enabled` and model has ONNX, use ONNX; else call Azure ML. On ONNX error, **fallback to Azure ML**.

---

## 3. Redis caching

- **Purpose:** Reduce repeated inference for the same (or similar) inputs.
- **Key:** e.g. `ml:win_prob:{tenantId}:{hash(featureVector)}` or `ml:risk:{tenantId}:{opportunityId}`. Hash must account for all feature values; TTL (e.g. 1–24 h) from config.
- **Config:** `redis.url` or `cache.redis.url` from config; no hardcoded URLs. Optional: `cache.redis.ttl_seconds`, `cache.redis.enabled`.
- **Flow:** Before Azure ML or ONNX: if cache hit, return. On infer: write result to Redis. Invalidate on model version change (key includes `modelVersion` or similar).
- **Fallback:** On Redis error or miss, proceed to ONNX or Azure ML. Do not block on Redis.

---

## 4. Scale-to-zero (Azure ML)

- **Managed Endpoints:** Set **min capacity to 0** (or the minimum Azure allows) when traffic has quiet periods. Reduces cost when idle.
- **Cold start:** After scale-from-zero, first requests may exceed 500 ms. Document in SLO/runbook; optionally:
  - Keep-warm: low concurrency or scheduled ping if budget allows.
  - Or accept cold-start and expose via `ml_prediction_duration_seconds` / alerts.
- **Compute:** For **batch** (e.g. clustering, propagation, training): use Azure ML compute that scales to 0 when idle, or spot/low-priority.

---

## 5. Cost tuning (Azure ML)

- **Right-size:** Choose instance type (CPU vs GPU, core count) to match load. Over-provisioning increases cost.
- **Reserve / spot:** For batch jobs (training, model-monitoring, clustering), use low-priority or spot compute where SLA allows.
- **Batch vs real-time:** Prefer **batch** for non-latency-critical (e.g. `POST /api/v1/predict/batch/win-probability`). Reserve real-time endpoints for interactive paths.
- **Per-tenant / global caps:** TBD; can be enforced in configuration-service or at the Azure subscription/resource level (operational).

---

## 6. Config (when implemented)

Example; all URLs and toggles from config (no hardcoded):

```yaml
# ml-service (ONNX/Redis for win-probability, risk-scoring; risk-analytics proxies to ml-service for win-prob)
onnx:
  enabled: ${ONNX_ENABLED:-false}
  model_path: ${ONNX_MODEL_PATH:-}   # or URL from config

cache:
  redis:
    enabled: ${CACHE_REDIS_ENABLED:-false}
    url: ${REDIS_URL:-}
    ttl_seconds: ${CACHE_REDIS_TTL_SECONDS:-3600}
```

---

## 7. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §11.7, §978
- [BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md) §2.5
- [deployment/monitoring/README.md](../README.md) – `ml_prediction_duration_seconds_bucket`, dashboards
- [validation.md](validation.md) – KPIs, targets, UAT
