# Security Service Module

Security analysis and protection service for Castiel, providing secret scanning, vulnerability scanning, PII detection, SAST/DAST/SCA, and code obfuscation.

## Features

- **Secret Scanning**: Detect API keys, passwords, tokens in code
- **Vulnerability Scanning**: Identify security vulnerabilities
- **PII Detection**: Detect personally identifiable information
- **SAST**: Static Application Security Testing
- **DAST**: Dynamic Application Security Testing
- **SCA**: Software Composition Analysis
- **Compliance Checking**: Security compliance verification
- **Threat Detection**: Identify security threats
- **Finding Management**: Track and remediate security findings

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Context Service (for code context)
- Quality Service (for code quality)
- Observability Service (for monitoring)
- Workflow Service (for security workflows)

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

- `security_scans` - Security scan data
- `security_findings` - Security findings

### Environment Variables

```bash
PORT=3042
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
CONTEXT_SERVICE_URL=http://localhost:3034
QUALITY_URL=http://localhost:3017
OBSERVABILITY_URL=http://localhost:3018
WORKFLOW_URL=http://localhost:3020
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

The Security Service provides multiple scanning types:

1. **Secret Scan**: Detect hardcoded secrets
2. **Vulnerability Scan**: Find security vulnerabilities
3. **PII Detection**: Identify personal information
4. **SAST**: Static code analysis
5. **DAST**: Dynamic application testing
6. **SCA**: Dependency vulnerability scanning

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `security.scan.created` | `{ scanId, type, tenantId }` | Security scan created |
| `security.scan.completed` | `{ scanId, findings, summary }` | Security scan completed |
| `security.finding.critical` | `{ findingId, severity, location }` | Critical finding detected |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3042 | Server port |
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

