# Pattern Recognition Module - Architecture

## Overview

The Pattern Recognition module provides codebase pattern learning and enforcement service for Castiel, including pattern learning, style consistency, design pattern detection, and anti-pattern detection.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `pattern_patterns` | `/tenantId` | Pattern definitions |
| `pattern_scans` | `/tenantId` | Pattern scan results |
| `pattern_matches` | `/tenantId` | Pattern match data |
| `pattern_libraries` | `/tenantId` | Pattern library data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **PatternService** - Pattern learning and management
2. **ScanService** - Pattern scanning
3. **MatchService** - Pattern matching
4. **LibraryService** - Pattern library management

## Data Flow

```
User Request / Scheduled Job
    ↓
Pattern Recognition Service
    ↓
Context Service (code context)
    ↓
Embeddings Service (vector operations)
    ↓
Knowledge Base (pattern knowledge)
    ↓
Quality Service (quality checks)
    ↓
AI Service (pattern learning)
    ↓
Cosmos DB (store patterns)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Context Service**: For code context
- **Embeddings Service**: For vector operations
- **Knowledge Base**: For pattern knowledge
- **Quality Service**: For quality checks
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
