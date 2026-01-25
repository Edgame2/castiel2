# @coder/shared

Shared utilities, types, and services for all Castiel containers.

## Overview

This package provides common functionality used across all microservices:

- **Database**: Cosmos DB client and connection pooling
- **Cache**: Redis client and multi-layer caching
- **Events**: RabbitMQ event publisher and consumer
- **Auth**: JWT utilities and service-to-service authentication
- **Middleware**: Tenant enforcement and validation
- **Services**: Service discovery and HTTP client with circuit breakers
- **Types**: Shared TypeScript types and interfaces
- **Utils**: Error classes, validation utilities

## Installation

```bash
# From any container directory
npm install @coder/shared
# or
pnpm add @coder/shared
```

## Usage

```typescript
import { AppError, CosmosDBClient, EventPublisher, ServiceClient } from '@coder/shared';
```

## Structure

- `database/` - Cosmos DB client and connection pooling
- `cache/` - Redis client and multi-layer caching
- `events/` - RabbitMQ event system
- `auth/` - JWT and service authentication
- `middleware/` - Request middleware (tenant enforcement, etc.)
- `services/` - Service discovery and HTTP clients
- `types/` - Shared TypeScript types
- `utils/` - Error classes and validation utilities

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```

