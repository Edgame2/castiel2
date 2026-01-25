# Logging Module - Architecture

## Overview

The Logging module provides enterprise-grade audit logging service for Castiel, including comprehensive audit trails, tamper evidence, compliance support, and configurable retention policies.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `audit_logs` | `/tenantId` | Audit log entries (TTL: 1 year default) |
| `audit_retention_policies` | `/tenantId` | Retention policy configurations |
| `audit_configurations` | `/tenantId` | Audit configuration settings |
| `audit_alert_rules` | `/tenantId` | Alert rule definitions |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation. Super Admin can access cross-org logs.

## Service Architecture

### Core Services

1. **LoggingService** - Log ingestion and storage
2. **RetentionService** - Retention policy management
3. **RedactionService** - Sensitive data redaction
4. **HashChainService** - SHA-256 hash chain for tamper evidence
5. **AlertService** - Alert rule evaluation

## Data Flow

```
Event / API Request
    ↓
Logging Service
    ↓
Data Redaction (sensitive data)
    ↓
Hash Chain (tamper evidence)
    ↓
Cosmos DB (store log)
    ↓
Retention Policy (TTL management)
    ↓
Event Publisher (RabbitMQ)
```

## Event Consumption

The module consumes events from RabbitMQ for event-driven log ingestion.

## External Dependencies

- **RabbitMQ**: For event-driven ingestion
- **Cosmos DB**: For log storage

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.

## Compliance

- SOC2 compliant
- GDPR compliant
- PCI-DSS compliant
- Tamper-evident hash chain
- Configurable retention policies
