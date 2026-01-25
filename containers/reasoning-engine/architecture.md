# Reasoning Engine Module - Architecture

## Overview

The Reasoning Engine module provides advanced reasoning capabilities service for Castiel, including chain-of-thought, tree-of-thought, analogical, counterfactual, and causal reasoning.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `reasoning_tasks` | `/tenantId` | Reasoning task data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ChainOfThoughtService** - Sequential reasoning steps
2. **TreeOfThoughtService** - Multi-branch exploration
3. **AnalogicalService** - Analogical reasoning
4. **CounterfactualService** - Counterfactual reasoning
5. **CausalService** - Causal reasoning

## Data Flow

```
User Request
    ↓
Reasoning Engine Service
    ↓
AI Service (reasoning execution)
    ↓
Prompt Management (prompt templates)
    ↓
Knowledge Base (context retrieval)
    ↓
Cosmos DB (store reasoning tasks)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For reasoning execution
- **Prompt Management**: For prompt templates
- **Knowledge Base**: For context retrieval
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
