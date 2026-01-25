# Agent Registry Module - Architecture

## Overview

The Agent Registry module provides management of specialized AI agents for Castiel, including agent registration, selection, execution tracking, and versioning. It enables capability-based agent matching and performance tracking.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `agent_agents` | `/tenantId` | Agent definitions, capabilities, and metadata |
| `agent_executions` | `/tenantId` | Agent execution history and results |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation and efficient tenant-scoped queries.

## Service Architecture

### Core Services

1. **AgentService** - CRUD operations for agents
2. **AgentSelectorService** - Selects agents based on capabilities and requirements
3. **AgentExecutionService** - Tracks agent execution and results

## Data Flow

```
User Request
    ↓
API Gateway
    ↓
Agent Registry Service
    ↓
Agent Selection / Execution
    ↓
AI Service / Prompt Service (for execution)
    ↓
Cosmos DB (store results)
    ↓
Event Publisher (RabbitMQ)
```

## Event Publishing

The module publishes events to RabbitMQ:
- `agent.registered` - When an agent is registered
- `agent.selected` - When an agent is selected for a task
- `agent.executed` - When an agent execution completes

## External Dependencies

- **AI Service**: For agent execution
- **Prompt Service**: For prompt management
- **Quality Service**: For quality monitoring
- **Observability Service**: For observability metrics
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
