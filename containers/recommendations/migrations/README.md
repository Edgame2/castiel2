# Recommendations migrations (Plan §10.7)

Run from `containers/recommendations` with env set (e.g. `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`).

**Platform bootstrap order:** Run **shard-manager bootstrap** first (ensure all Cosmos containers + seed shard types). Then run these migrations if you need recommendations feedback containers and feedback-type seed data:

- **001_create_feedback_containers.ts** – Ensure Cosmos containers: recommendation_feedback, recommendation_feedback_aggregation, recommendation_config. (Optional if shard-manager bootstrap with `ensure_cosmos_containers` already ran.)
- **002_seed_feedback_types.ts** – Seed 25+ feedback types and global_feedback_config into recommendation_config (idempotent; run after 001).

```bash
pnpm run migrate:001
pnpm run migrate:002
```

Feedback types are also seeded on first GET `/api/v1/admin/feedback-types` (FeedbackService.getFeedbackTypes) if not present.
