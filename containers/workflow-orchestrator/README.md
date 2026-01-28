# Workflow-orchestrator Module

Orchestrates workflows, HITL approvals, and **batch jobs** (Plan §9.3). Publishes `workflow.job.trigger` to `bi_batch_jobs`; risk-analytics BatchJobWorker consumes and runs jobs.

## Features

- **BatchJobScheduler (Plan §9.3):** node-cron; publishes `workflow.job.trigger` for `risk-snapshot-backfill`, `outcome-sync`, `industry-benchmarks`, `risk-clustering`, `account-health`, `propagation`, `model-monitoring`. Config: `batch_jobs.*_cron`. See [model-monitoring](../../deployment/monitoring/runbooks/model-monitoring.md), [backfill-failure](../../deployment/monitoring/runbooks/backfill-failure.md).
- **HITL approvals (Plan §972):** GET/POST hitl/approvals; Cosmos `hitl_approvals`.
- **Workflow execution:** workflow_workflows, workflow_steps, workflow_executions.

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `workflow_workflows`, `workflow_steps`, `workflow_executions` - Workflow data
- `hitl_approvals` - HITL approvals (Plan §972); partition key `tenantId`

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Events

### Published

- `workflow.job.trigger` — `{ job, metadata }` to queue `bi_batch_jobs` (risk-snapshot-backfill, outcome-sync, industry-benchmarks, risk-clustering, account-health, propagation, model-monitoring). Consumer: risk-analytics BatchJobWorker.

### Consumed

- `shard.updated`, `integration.opportunity.updated` — for workflow and HITL flows (see hitl-approval-flow runbook).

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
