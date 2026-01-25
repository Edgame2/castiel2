# Logging Module

Enterprise-grade audit logging service for Castiel.

## Features

- **Audit Trail**: Comprehensive logging of user actions, data access, security events
- **Multi-tenancy**: Organization-isolated logs with Super Admin cross-org access
- **Tamper Evidence**: SHA-256 hash chain for log integrity verification
- **Compliance**: SOC2, GDPR, PCI-DSS compliant
- **Configurable Retention**: Per-organization, per-category retention policies
- **Data Redaction**: Automatic redaction of sensitive data
- **Pluggable Storage**: PostgreSQL (default), Elasticsearch (future)

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (optional, for event-driven ingestion)

### Installation

```bash
pnpm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `audit_logs` - Audit log entries (TTL: 1 year default)
- `audit_retention_policies` - Retention policy configurations
- `audit_alert_rules` - Alert rule definitions
- `audit_hash_checkpoints` - Hash chain checkpoints
- `audit_configurations` - Organization-specific configurations
- `audit_exports` - Export job records

See [architecture.md](./docs/architecture.md) for container structure and partition key details.

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3014 | Server port |
| server.host | string | 0.0.0.0 | Server host |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| cosmos_db.database_id | string | castiel | Cosmos DB database ID (shared database) |
| storage.provider | string | cosmos | Storage backend (cosmos | elasticsearch) |
| **data_lake.connection_string** | string | - | Azure Storage (Data Lake) connection string. Required for **DataLakeCollector** and **MLAuditConsumer** (BI Sales Risk Plan §3.5, FIRST_STEPS §3). |
| **data_lake.container** | string | risk | Blob container for Parquet and ML audit blobs. |
| **data_lake.path_prefix** | string | /risk_evaluations | Path prefix for DataLakeCollector Parquet output. |
| **data_lake.audit_path_prefix** | string | /ml_audit | Path prefix for MLAuditConsumer audit JSON blobs. |
| **rabbitmq.data_lake.queue** | string | logging_data_lake | Queue for DataLakeCollector. Bindings: `risk.evaluated`. |
| **rabbitmq.ml_audit.queue** | string | logging_ml_audit | Queue for MLAuditConsumer. Bindings: `risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed`. |
| defaults.hash_chain.enabled | boolean | true | Enable tamper-evident logging |
| defaults.redaction.enabled | boolean | true | Enable sensitive data redaction |
| defaults.retention.default_days | number | 90 | Default retention period |

See `config/default.yaml` for full configuration options.

## Documentation

| Document | Description |
|----------|-------------|
| [OpenAPI Specification](./docs/openapi.yaml) | Complete API documentation |
| [Architecture](./docs/architecture.md) | Design decisions and diagrams |
| [Logs Events](./docs/logs-events.md) | Events consumed for audit logging |
| [Notifications Events](./docs/notifications-events.md) | Events published that trigger notifications |

## API Reference

See [OpenAPI Specification](./docs/openapi.yaml)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/logs` | Create audit log entry |
| POST | `/api/v1/logs/batch` | Create multiple log entries |
| GET | `/api/v1/logs` | List logs with filters |
| GET | `/api/v1/logs/search` | Full-text search |
| GET | `/api/v1/logs/aggregate` | Get aggregation statistics |
| GET | `/api/v1/logs/my-activity` | User's own activity |
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |

## Events

### Consumed Events

| Event | Handler |
|-------|---------|
| `auth.login.success` | Log authentication event |
| `auth.login.failed` | Log failed authentication |
| `user.created` | Log user creation |
| `secret.accessed` | Log secret access |

**BI / Risk (Plan §3.5, FIRST_STEPS §3)** — require `data_lake.connection_string` and `rabbitmq.data_lake` / `rabbitmq.ml_audit`:

| Event | Handler | Output |
|-------|---------|--------|
| `risk.evaluated` | **DataLakeCollector** | Parquet at `/risk_evaluations/year=.../month=.../day=.../` (DATA_LAKE_LAYOUT §2.1) |
| `risk.evaluated` | **MLAuditConsumer** | Audit JSON at `audit_path_prefix/year=.../month=.../day=.../` (Blob, 7-year retention) |
| `risk.prediction.generated` | **MLAuditConsumer** | Audit JSON (predictionId, opportunityId, horizons, modelId, predictionDate; Plan §10) |
| `ml.prediction.completed` | **MLAuditConsumer** | Audit JSON (modelId, opportunityId?, inferenceMs) |
| `remediation.workflow.completed` | **MLAuditConsumer** | Audit JSON |

### Published Events

| Event | Description |
|-------|-------------|
| `audit.alert.triggered` | Alert rule was triggered |
| `audit.verification.failed` | Hash chain verification failed |

## Development

### Running Tests

```bash
pnpm test           # All tests
pnpm test:coverage  # With coverage
```

### Code Style

```bash
pnpm lint           # Check linting
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGGING MODULE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Ingestion │  │   Storage   │  │    Query    │             │
│  │   Service   │  │   Provider  │  │   Service   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Provider Abstraction Layer               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │   │
│  │  │PostgreSQL│  │   S3   │  │  SIEM   │                 │   │
│  │  │ Provider │  │Provider│  │ Provider│                 │   │
│  │  └─────────┘  └─────────┘  └─────────┘                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## License

Proprietary
