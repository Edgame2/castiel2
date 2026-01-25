# Configuration Service Module - Architecture

## Overview

The Configuration Service module provides centralized configuration management for Castiel, including configuration storage, retrieval, and migration management.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `configuration_settings` | `/tenantId` | Configuration settings |
| `migration_migrations` | `/tenantId` | Migration definitions |
| `migration_steps` | `/tenantId` | Migration step data |
| `migration_plans` | `/tenantId` | Migration plan data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ConfigurationService** - Configuration storage and retrieval
2. **MigrationService** - Migration management
3. **MigrationStepService** - Migration step execution
4. **MigrationExecutorService** - Migration execution

## Data Flow

```
User Request
    ↓
Configuration Service
    ↓
Context Service (context for migrations)
    ↓
Execution Service (execute migrations)
    ↓
Quality Service (validate migrations)
    ↓
Knowledge Base (migration knowledge)
    ↓
Cosmos DB (store configuration)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Context Service**: For migration context
- **Execution Service**: For migration execution
- **Quality Service**: For migration validation
- **Knowledge Base**: For migration knowledge
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
