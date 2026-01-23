# Compliance Service Module

Regulatory and policy compliance service for Coder IDE, ensuring adherence to industry standards (WCAG, OWASP) and regulatory requirements (GDPR, HIPAA, SOC2).

## Features

- **Standards Compliance**: WCAG, OWASP Top 10, ISO27001
- **Regulatory Compliance**: GDPR, HIPAA, SOC2, PCI-DSS
- **Compliance Checking**: Automated compliance verification
- **Policy Management**: Custom compliance policies and rules
- **Violation Tracking**: Compliance violations with remediation steps
- **Requirement Tracking**: Compliance requirements with status
- **Audit Reporting**: Compliance audit reports

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Quality Service (for code quality checks)
- Security Service (for security compliance)
- Validation Engine (for validation rules)
- Workflow Service (for compliance workflows)

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

- `compliance_checks` - Compliance check data
- `compliance_requirements` - Compliance requirements
- `compliance_violations` - Compliance violations
- `compliance_policies` - Compliance policies

### Environment Variables

```bash
PORT=3043
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
QUALITY_URL=http://localhost:3017
SECURITY_SERVICE_URL=http://localhost:3042
VALIDATION_ENGINE_URL=http://localhost:3036
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

The Compliance Service supports multiple compliance standards:

1. **WCAG**: Web Content Accessibility Guidelines
2. **OWASP**: OWASP Top 10 security standards
3. **GDPR**: General Data Protection Regulation
4. **HIPAA**: Health Insurance Portability and Accountability Act
5. **SOC2**: System and Organization Controls 2
6. **PCI-DSS**: Payment Card Industry Data Security Standard
7. **ISO27001**: Information Security Management

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `compliance.check.created` | `{ checkId, standard, tenantId }` | Compliance check created |
| `compliance.check.completed` | `{ checkId, status, violations }` | Compliance check completed |
| `compliance.violation.found` | `{ violationId, requirementId, severity }` | Compliance violation found |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3043 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Coder IDE

