# Collaboration Service Module

Real-time collaboration features service for Castiel.

## Features

- **Collaboration**: Real-time collaboration features
- **Conversation Management**: Conversation and chat management

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Shard Manager Service
- Logging Service
- User Management Service

### Database Setup

- `collaboration_conversations` - Conversations (partition key: `/tenantId`)
- `collaboration_messages` - Messages (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3031 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/collaboration/conversations` | List conversations |
| POST | `/api/v1/collaboration/conversations` | Create conversation |
| GET | `/api/v1/collaboration/conversations/:id/messages` | Get messages |

## Dependencies

- **Shard Manager**: For data access
- **Logging**: For audit logging
- **User Management**: For user context

## License

Proprietary

