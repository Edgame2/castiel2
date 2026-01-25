# Security Scanning Module

Security scanning and PII detection service for Castiel, providing PII detection, redaction, field-level security, device security tracking, password history, and rate limiting.

## Features

- **PII Detection**: Detect personally identifiable information in content
- **PII Redaction**: Redact PII from content
- **Field Security**: Field-level access control
- **Device Security**: Device tracking and security
- **Password History**: Password history management
- **Rate Limiting**: Rate limiting for API endpoints

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

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

- `security_scans` - Security scan results (partition: `/tenantId`)
- `security_pii_detections` - PII detection results (partition: `/tenantId`)
- `security_device_tracking` - Device tracking data (partition: `/tenantId`)

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

## Events

### Published Events

- `security.scan.completed` - Security scan completed
- `security.pii.detected` - PII detected in content

### Consumed Events

- (None currently)

## Dependencies

- **auth**: For authentication and device tracking
- **secret-management**: For secret scanning
- **shard-manager**: For shard access

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
