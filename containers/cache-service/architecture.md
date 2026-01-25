# Cache Service Module - Architecture

## Overview

The Cache Service module provides caching and cache management for Castiel, including cache administration, optimization, and warming.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `cache_metrics` | `/tenantId` | Cache performance metrics |
| `cache_strategies` | `/tenantId` | Cache strategy configurations |

### Redis Cache

The module uses Redis for in-memory caching with configurable TTL.

## Service Architecture

### Core Services

1. **Cache Management** - Cache administration and optimization
2. **Cache Warming** - Pre-populate cache
3. **Metrics Collection** - Track cache performance

## Data Flow

```
User Request
    ↓
Cache Service
    ↓
Redis (check cache)
    ↓
Cache Hit → Return
Cache Miss → Fetch from source → Store in cache
    ↓
Cosmos DB (store metrics)
```

## External Dependencies

- **Redis**: For cache storage
- **Logging Service**: For audit logging
- **Embeddings Service**: For cache operations

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
