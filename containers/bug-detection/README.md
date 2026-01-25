# Bug Detection Module

Bug detection and fixing service for Castiel, providing anomaly detection, bug prediction, root cause analysis, auto-fix suggestions, and bug tracking.

## Features

- **Anomaly Detection**: Detect code anomalies and potential bugs
- **Bug Prediction**: Predict bugs before they occur
- **Root Cause Analysis**: Analyze root causes of bugs
- **Auto-Fix Suggestions**: Generate automatic fix suggestions
- **Bug Tracking**: Track bugs through their lifecycle
- **Bug Fix Management**: Manage bug fixes and verifications
- **Multiple Bug Types**: Support for various bug categories
- **Severity Levels**: Critical, high, medium, low severity classification
- **Detection Methods**: Static analysis, runtime analysis, pattern matching
- **Fix Verification**: Verify bug fixes

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for bug detection and fix generation)
- Context Service (for code context)
- Validation Engine (for fix validation)

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

- `bug_detection_bugs` - Bug data
- `bug_detection_scans` - Bug detection scan data
- `bug_detection_fixes` - Bug fix data

### Environment Variables

```bash
PORT=3039
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
CONTEXT_SERVICE_URL=http://localhost:3034
VALIDATION_ENGINE_URL=http://localhost:3036
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

The Bug Detection service provides multiple detection capabilities:

1. **Anomaly Detection**: Detect unusual code patterns
2. **Bug Prediction**: Predict potential bugs
3. **Root Cause Analysis**: Analyze bug causes
4. **Auto-Fix**: Generate fix suggestions
5. **Bug Tracking**: Track bug lifecycle

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `bug.detected` | `{ bugId, type, severity, location }` | Bug detected |
| `bug.fixed` | `{ bugId, fixId, verified }` | Bug fixed |
| `bug.scan.completed` | `{ scanId, bugsFound }` | Bug scan completed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3039 | Server port |
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

