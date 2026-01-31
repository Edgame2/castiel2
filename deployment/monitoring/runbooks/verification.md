# Feedbacks and Recommendations – Verification Checklist

Per original plan [.cursor/plans/feedbacks_and_recommendations_plan_995d2873.plan.md](../../.cursor/plans/feedbacks_and_recommendations_plan_995d2873.plan.md) §10 (Acceptance criteria, testing, migrations, success criteria). Use this checklist to verify Phase 1–6 and remaining work.

## Phase 1–6 acceptance (§10.1)

- **Phase 1:** Feedback recording &lt;100ms (p95), catalog query &lt;200ms (p95); 25+ feedback types seeded; Data Lake sync to `/feedback/year=.../month=.../day=.../`; Action Catalog risks + recommendations; template rendering; tests &gt;80%.
- **Phase 2:** Feature extraction &lt;500ms (p95), ML prediction &lt;2000ms (p95); feature cache hit &gt;80%; model selection; circuit breaker and retry; tests &gt;80%.
- **Phase 3–4:** Explanation &lt;1000ms (p95), LLM reasoning &lt;3000ms (p95), decision &lt;100ms (p95), end-to-end &lt;5000ms (p95); full CAIS loop functional.
- **Phase 5–6:** Gaps (Risk Catalog, Sales Methodology, Reactivation, Tenant ML Config) and Super Admin UI (10 areas); acceptance from previous phases still met.

## Performance checkpoints (§10.5)

- After Phase 1: feedback &lt;100ms (p95), catalog &lt;200ms (p95), cache hit &gt;80%.
- After Phase 2: feature &lt;500ms (p95), ML &lt;2000ms (p95), combined &lt;2500ms (p95).
- After Phase 3: explanation &lt;1000ms (p95), LLM &lt;3000ms (p95), decision &lt;100ms (p95), end-to-end &lt;5000ms (p95).
- Load: 50 predictions/s sustained 1h, 100 concurrent users, 10k opportunities.

## Testing

- **Unit:** Per-module Vitest; mock Cosmos, Redis, RabbitMQ, Azure ML. Example: `containers/learning-service/tests/unit/services/FeedbackLearningService.test.ts` (linkFeedbackToPrediction).
- **Integration:** Per-module route tests where workspace resolution allows; otherwise rely on unit tests and manual/API checks.
- **E2E:** Full CAIS loop (Feature → ML → Explanation → LLM → Decision → Feedback → Learning) when tooling is available.

## Migrations (§10.7)

- Confirm scripts exist and are tested: feedback containers, seed feedback types, action_catalog shard type, risk catalog migration (destructive; document breaking changes).
- learning-service: user_feedback and outcome containers created via infra or migration.
- Rollback scripts for each migration; test rollback before production.

## Success criteria (§10.8)

- Functional: 780+ requirements, APIs documented (Swagger/OpenAPI), Super Admin screens per spec.
- Performance: latency targets (p95), cache hit &gt;70%, recommendation accuracy &gt;85%.
- Quality: coverage &gt;80%, zero critical bugs, security and accessibility audits.
- Operational: dashboards (see [README](../README.md)), alerts, runbooks, disaster recovery tested.

## Remaining plan items

See `.cursor/plans/feedbacks_recommendations_remaining_*.plan.md`: linkFeedbackToPrediction API (done), feedback.aggregation.updated (done), Super Admin §8/§9 documented, Terraform README Assumed resources, POST /api/v1/ml/evaluation (done), Azure ML path documented, verification (this checklist).
