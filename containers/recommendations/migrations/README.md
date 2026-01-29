# Recommendations migrations (Plan §10.7)

Run from `containers/recommendations` with env set (e.g. `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`).

- **001_create_feedback_containers.ts** – Ensure Cosmos containers: recommendation_feedback, recommendation_feedback_aggregation, recommendation_config.
- **002_seed_feedback_types.ts** – Seed 25+ feedback types and global_feedback_config into recommendation_config (idempotent; run after 001).

```bash
pnpm run migrate:001
pnpm run migrate:002
```

Feedback types are also seeded on first GET `/api/v1/admin/feedback-types` (FeedbackService.getFeedbackTypes) if not present.
