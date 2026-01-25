# Validation Engine Module - Architecture

## Overview

The Validation Engine module provides comprehensive validation service for Castiel, including syntax validation, semantic validation, architecture validation, security validation, and performance validation.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `validation_rules` | `/tenantId` | Validation rule definitions |
| `validation_runs` | `/tenantId` | Validation run data |
| `validation_results` | `/tenantId` | Validation results |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ValidationService** - Multi-stage validation execution
2. **RuleService** - Validation rule management
3. **ResultService** - Validation result tracking

## Data Flow

```
User Request / Scheduled Job
    ↓
Validation Engine Service
    ↓
Quality Service (quality checks)
    ↓
Context Service (code context)
    ↓
Knowledge Base (validation knowledge)
    ↓
Compliance Service (compliance validation)
    ↓
Cosmos DB (store validation results)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Quality Service**: For quality checks
- **Context Service**: For code context
- **Knowledge Base**: For validation knowledge
- **Compliance Service**: For compliance validation
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
