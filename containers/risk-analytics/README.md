# Risk Analytics Module

Complete risk evaluation and revenue analytics system for Castiel, providing risk evaluation, revenue at risk calculations, quota management, early warning systems, benchmarking, simulations, and related risk analytics features.

## Features

- **Risk Evaluation**: Asynchronous risk evaluation with rule-based, AI-powered, and historical pattern matching. Historical pattern matching uses vector search for similar opportunities when `search_service` is configured, with fallback to attribute-based (stage, amount) shard-manager query (MISSING_FEATURES 4.5).
- **Risk Catalog**: Global, industry, and tenant-specific risk catalog management
- **Revenue at Risk**: Calculate revenue at risk for opportunities, portfolios, teams, and tenants
- **Quota Management**: Quota definitions and performance tracking
- **Early Warning**: Detect early-warning signals for opportunities (stage stagnation, activity drop, stakeholder churn, risk acceleration)
- **Benchmarking**: Calculate benchmarks for win rates, closing times, and deal sizes
- **Simulation**: Run risk simulations with modified scenarios
- **Data Quality**: Validate data quality for risk evaluations
- **Assumptions** (MISSING_FEATURES 4.3): Evaluation results always include `assumptions` (data quality with completeness and issues, staleness with lastUpdated/daysSinceUpdate/isStale, missingDataWarnings). Intended for UI display so users see data quality warnings. Documented in OpenAPI as `RiskEvaluationAssumptions`.
- **Trust Level**: Calculate trust levels for risk evaluations
- **AI Validation**: Validate AI-generated risk evaluations
- **Explainability**: Generate explainability for risk evaluations

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

`auto_evaluation` (optional): `enabled`, `trigger_on_opportunity_update`, `trigger_on_shard_update`, `trigger_on_risk_catalog_update` (default true), `max_reevaluations_per_catalog_event` (default 50) control automatic risk evaluation. Workflow-triggered events are not affected.

`services.search_service.url` (optional): When set, historical pattern matching uses vector search for similar opportunities; otherwise it uses shard-manager attribute-based query (stage, amount). Override via `SEARCH_SERVICE_URL`.

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `risk_evaluations` - Risk evaluation data (partition: `/tenantId`)
- `risk_revenue_at_risk` - Revenue at risk calculations (partition: `/tenantId`)
- `risk_quotas` - Quota definitions (partition: `/tenantId`)
- `risk_warnings` - Early warning signals (partition: `/tenantId`)
- `risk_simulations` - Risk simulation results (partition: `/tenantId`)

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

### Published Events

- `risk.evaluation.completed` - Risk evaluation completed
- `revenue-at-risk.calculated` - Revenue at risk calculated
- `quota.created` - Quota created
- `quota.deleted` - Quota deleted
- `early-warning.signals-detected` - Early warning signals detected
- `risk.simulation.completed` - Risk simulation completed

### Consumed Events

- `opportunity.updated` - Auto risk evaluation when opportunity is updated (config: `auto_evaluation.trigger_on_opportunity_update`)
- `integration.opportunity.updated` - Auto risk evaluation when opportunity changes via integration
- `shard.created` - Auto risk evaluation when opportunity shard is created (config: `auto_evaluation.trigger_on_shard_update`)
- `shard.updated` - Auto risk evaluation when opportunity shard is updated
- `risk.catalog.updated`, `risk.catalog.enabled`, `risk.catalog.disabled` - Re-evaluate opportunities whose evaluations reference the changed risk (config: `auto_evaluation.trigger_on_risk_catalog_update`; limit: `max_reevaluations_per_catalog_event`)
- `integration.sync.completed` - Log only; evaluations triggered by shard/opportunity events
- `workflow.risk.analysis.requested` - Process workflow-triggered risk analysis
- `workflow.risk.scoring.requested` - Process risk scoring workflow request

## Dependencies

- **ai-insights**: For AI-powered risk detection
- **ml-service**: For ML-based risk scoring
- **analytics-service**: For analytics integration
- **shard-manager**: For shard access
- **adaptive-learning**: For CAIS integration (learned weights)

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
