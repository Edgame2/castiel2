# Pattern Recognition Module

Codebase pattern learning and enforcement service for Castiel, providing pattern learning, style consistency, design pattern detection, anti-pattern detection, and pattern scanning.

## Features

- **Pattern Learning**: Learn patterns from codebase
- **Style Consistency**: Enforce code style patterns
- **Design Pattern Detection**: Detect design patterns
- **Anti-Pattern Detection**: Detect anti-patterns
- **Pattern Scanning**: Scan codebase for patterns
- **Pattern Library**: Manage pattern libraries
- **Pattern Matching**: Match patterns in code
- **Pattern Recommendations**: Recommend pattern usage

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for pattern learning)
- Context Service (for code context)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `pattern_recognition_patterns` - Pattern data
- `pattern_recognition_scans` - Pattern scan data

### Environment Variables

```bash
PORT=3037
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
CONTEXT_SERVICE_URL=http://localhost:3034
RABBITMQ_URL=amqp://localhost:5672
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Architecture

The Pattern Recognition service provides:

1. **Pattern Learning**: Learn from codebase
2. **Pattern Matching**: Match patterns in code
3. **Pattern Scanning**: Scan for patterns
4. **Pattern Library**: Manage patterns
5. **Style Enforcement**: Enforce style patterns

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `pattern.learned` | `{ patternId, type, tenantId }` | Pattern learned |
| `pattern.matched` | `{ patternId, matchId, location }` | Pattern matched |
| `pattern.scan.completed` | `{ scanId, matchesFound }` | Pattern scan completed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3037 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Castiel

