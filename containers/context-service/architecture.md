# Context Service Module - Architecture

## Overview

The Context Service module provides centralized context management for Castiel, including context storage, AST analysis, dependency tree building, call graph construction, and dynamic context assembly.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `context_contexts` | `/tenantId` | Context data and snapshots |
| `context_assemblies` | `/tenantId` | Context assembly configurations |
| `context_dependency_trees` | `/tenantId` | Dependency tree data |
| `context_call_graphs` | `/tenantId` | Call graph data |
| `context_analyses` | `/tenantId` | Context analysis results |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ContextService** - Context storage and retrieval
2. **ContextAssemblerService** - Dynamic context assembly
3. **DependencyService** - Dependency tree building
4. **CallGraphService** - Call graph construction
5. **ContextQualityService** - Context quality assessment
6. **ContextCacheService** - Context caching
7. **ContextTemplateService** - Context template management

## Data Flow

```
User Request
    ↓
Context Service
    ↓
AST Analysis / Dependency Analysis
    ↓
Context Assembly
    ↓
Cosmos DB (store context)
    ↓
Cache Service (cache context)
    ↓
Return Context
```

## External Dependencies

- **Embeddings Service**: For vector operations
- **AI Service**: For context analysis
- **Search Service**: For context search
- **Cache Service**: For context caching
- **Shard Manager**: For data sharding
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
