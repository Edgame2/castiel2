# Learning Service Module

Feedback loop (Plan W6 Layer 7): record user feedback, outcomes, aggregate feedback, satisfaction, reports, and trends. Publishes `feedback.recorded`, `outcome.recorded`, `feedback.trend.alert`.

## Features

- Record user feedback and outcomes (Cosmos: `user_feedback`, `outcome`, partitionKey `tenantId`)
- Link feedback to predictions; aggregate feedback; calculate satisfaction
- Summary and trends APIs by model
- RabbitMQ events: `feedback.recorded`, `outcome.recorded`, `feedback.trend.alert`

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ (optional, for events)

### Configuration

Config from `config/default.yaml`; override with env (e.g. `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `JWT_SECRET`, `RABBITMQ_URL`). No hardcoded ports or service URLs.

### Running

```bash
pnpm install
pnpm run dev
```

Default port: 3063 (override with `PORT`).

## API Reference

- `POST /api/v1/feedback` – record feedback
- `POST /api/v1/outcomes` – record outcome
- `GET /api/v1/feedback/summary/:modelId` – feedback summary by model
- `GET /api/v1/feedback/trends/:modelId` – feedback trends by model

See [openapi.yaml](./openapi.yaml).

## Events

### Published

- `feedback.recorded`
- `outcome.recorded`
- `feedback.trend.alert`

### Consumed

- None (APIs and optional future consumers).
