# Cache Service Module

Caching and cache management service for Castiel.

## Features

- **Cache Management**: Cache administration and optimization
- **Cache Warming**: Pre-populate cache

## Quick Start

### Prerequisites

- Node.js 20+
- Redis
- Logging Service

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3035 | Server port |
| redis.url | string | - | Redis URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cache/stats` | Get cache statistics |
| POST | `/api/v1/cache/clear` | Clear cache |
| POST | `/api/v1/cache/warm` | Warm cache |

## Dependencies

- **Redis**: For cache storage
- **Logging**: For audit logging

## License

Proprietary

