# Performance Optimization Module - Architecture

## Overview

The Performance Optimization module provides code performance optimization service for Castiel, including code optimization, bundle size optimization, database query optimization, and algorithm selection.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `performance_optimizations` | `/tenantId` | Optimization data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **OptimizationService** - Code optimization
2. **OptimizerService** - Optimization engine

## Data Flow

```
User Request / Scheduled Job
    ↓
Performance Optimization Service
    ↓
Context Service (code context)
    ↓
Observability Service (metrics)
    ↓
Execution Service (code execution)
    ↓
Quality Service (quality checks)
    ↓
Cosmos DB (store optimizations)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Context Service**: For code context
- **Observability Service**: For metrics
- **Execution Service**: For code execution
- **Quality Service**: For quality checks
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
