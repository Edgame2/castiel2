# Migration Service Module - Architecture

## Overview

The Migration Service module provides code migrations and refactoring service for Castiel, including migration management, step-based execution, rollback capabilities, and version upgrade handling.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `migration_migrations` | `/tenantId` | Migration definitions |
| `migration_steps` | `/tenantId` | Migration step data |
| `migration_plans` | `/tenantId` | Migration plan data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **MigrationService** - Migration management
2. **StepService** - Step-based execution
3. **RollbackService** - Rollback capabilities
4. **VersionService** - Version upgrade handling

## Data Flow

```
User Request
    ↓
Migration Service
    ↓
Context Service (code context)
    ↓
Execution Service (execute migration)
    ↓
Quality Service (validate migration)
    ↓
Knowledge Base (migration knowledge)
    ↓
Cosmos DB (store migration data)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Context Service**: For code context
- **Execution Service**: For code execution
- **Quality Service**: For validation
- **Knowledge Base**: For migration knowledge
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
