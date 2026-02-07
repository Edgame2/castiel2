# Castiel Platform – Services

**For the full, up-to-date list of all containers, ports, and integration details, see [containers/README.md](containers/README.md).**

The platform is **Castiel**, an AI-native business intelligence platform. The following services are part of Castiel:

- **ai-service** – Centralized hub for LLM operations
- **embeddings** – Vector embeddings and semantic search
- **prompt-service** – Prompt management and A/B testing
- **reasoning-engine** – Advanced reasoning (chain-of-thought, causal, etc.)
- **secret-management** – Secure credential storage
- **notification-manager** – Multi-channel notifications
- **usage-tracking** – Usage metering and quota management
- **shard-manager** – Core data model (shards, types, relationships)
- **ui** – Next.js frontend
- **api-gateway** – Single entry point for API requests

Migration management is provided by **configuration-service** (migration routes and MigrationService/MigrationStepService/MigrationExecutorService). The standalone migration-service container has been removed.

See **[containers/README.md](containers/README.md)** for the authoritative container list and per-container documentation.
