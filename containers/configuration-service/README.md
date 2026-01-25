# Configuration Service Module

Centralized configuration management service for Castiel.

## Features

- **Configuration Management**: Centralized configuration storage and retrieval

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Logging Service
- Secret Management Service

### Database Setup

- `configuration_settings` - Configuration settings (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3034 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/configuration` | Get configuration |
| PUT | `/api/v1/configuration` | Update configuration |

## Dependencies

- **Logging**: For audit logging
- **Secret Management**: For secret storage

## License

Proprietary

