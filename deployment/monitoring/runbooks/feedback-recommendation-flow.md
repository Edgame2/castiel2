# Feedback and Recommendation Flow — Plan W1, Data Lake Sync

Verification that recommendation feedback is recorded, aggregated, published to RabbitMQ, and written to Data Lake. Per Feedbacks and Recommendations plan W1 and RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS.

---

## 1. Flow overview

| Step | Component | Action |
|------|-----------|--------|
| 1 | **recommendations** | `recordFeedback()` stores in Cosmos `recommendation_feedback`, `feedback_aggregation`; publishes `recommendation.feedback.received` (tenantId, payload). |
| 2 | **logging** | **DataLakeCollector** consumes `recommendation.feedback.received`; writes Parquet to Data Lake `/feedback/year=.../month=.../day=.../`. |
| 3 | **recommendations** | GET feedback-types (seeds 25+ if empty); GET/PUT global and tenant feedback config. |

---

## 2. Config to verify

- **recommendations** `config/default.yaml`: `cosmos_db.containers.feedback`, `cosmos_db.containers.feedback_aggregation`, `cosmos_db.containers.recommendation_config`; `rabbitmq` exchange and bindings; `services.user_management.url` for admin tenant list.
- **logging** `config/default.yaml`: `rabbitmq.data_lake.bindings` includes `recommendation.feedback.received`; `data_lake.connection_string`; path prefix for feedback (e.g. `/feedback`).

---

## 3. How to verify at runtime

1. **RabbitMQ:** Confirm logging Data Lake queue is bound to `recommendation.feedback.received`.
2. **Recommendations:** POST feedback via API; confirm document in `recommendation_feedback`; confirm event published.
3. **Data Lake:** When `data_lake.connection_string` is set in logging, confirm Parquet files under `/feedback/year=.../month=.../day=.../` after feedback is recorded.
4. **Aggregation:** GET aggregation API by tenant/rec-type/period; confirm response matches stored aggregation.

---

## 4. Troubleshooting

- **No feedback in Data Lake:** Check logging consumer bindings and `data_lake.connection_string`; confirm event payload includes required fields (tenantId, recommendationId, feedbackType, recordedAt, etc.).
- **Aggregation empty:** Confirm feedback was recorded for the tenant/period; check partition key (tenantId) and aggregation key in Cosmos.
- **Tenant list empty (Super Admin):** Confirm `GET /api/v1/admin/tenants` is routed to recommendations; recommendations calls user-management `GET /api/v1/admin/organizations` with forwarded Authorization; user-management returns orgs for Super Admin users.

See also: [audit-event-flow.md](audit-event-flow.md), [deployment/monitoring/README.md](../README.md).
