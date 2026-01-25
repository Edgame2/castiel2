# BI Risk Step — One Task at a Time

Implement **one** BI Sales Risk task with plan awareness and quality checks.

## 1. Load context

- **Always:** `documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md` (Phases 1–2, §10), `documentation/requirements/BI_SALES_RISK_SHARD_SCHEMAS.md`.
- **If Data Lake, outcome, or Parquet:** `BI_SALES_RISK_DATA_LAKE_LAYOUT.md`.
- **If features, buildVector, or ml-service prediction pipeline:** `BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md`.
- **If Python in ml-service/scripts:** `BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md`.
- **If observability (/metrics, App Insights):** Plan §8.5, `deployment/monitoring/README.md`.
- Follow `.cursorrules` and `documentation/global/ModuleImplementationGuide.md`. **Order:** `BI_SALES_RISK_IMPLEMENTATION_FIRST_STEPS.md` (if present).

## 2. Pick one task

- Prefer the **next unchecked** `- [ ]` in Phase 1 or 2 for the container you’re in, or the task the user names.
- If ambiguous: list 1–3 candidates and ask which to do.

## 3. Implement

- Small, buildable steps. Backend before frontend when applicable.
- **opportunityId** = c_opportunity shard id. **tenantId** only; **RabbitMQ** for events and job triggers; **no hardcoded URLs/ports**.
- For events: `{domain}.{entity}.{action}`; include `tenantId` in payloads.
- For batch jobs: `workflow.job.trigger`, `bi_batch_jobs`, `workflow.job.completed` / `workflow.job.failed`. Job list: plan §9.3 (incl. outcome-sync, model-monitoring).

## 4. Validate

- Build and run (or `npm run build` / `npm test` in the container).
- Lint. If new routes: note for OpenAPI.
- If new events: note for `logs-events.md` or `notifications-events.md`. If /metrics: use metric names from plan §8.5.2 and `deployment/monitoring/README.md`.

## 5. Output

- **Progress:** “Phase X: A / B tasks” and “Next: <task>”.
- **Changes:** files touched; new config/events to document.
- **Next task:** the following `- [ ]` or user’s next request.
