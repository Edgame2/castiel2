# Secret Management Service

Centralized, secure, and auditable system for storing, managing, and accessing sensitive credentials across the Castiel platform.

## Features

- **Encryption**: AES-256-GCM encryption with key rotation
- **Multi-Backend Support**: Local encrypted storage (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager - planned)
- **Access Control**: Role-based access control (RBAC) with explicit grants and hierarchical scoping
- **Lifecycle Management**: Expiration tracking, automatic/manual rotation, versioning, soft delete
- **Audit Logging**: Comprehensive audit trail for compliance
- **Event Publishing**: Integration with Notification Module via RabbitMQ
- **Operational Logging**: Integration with Logging Service
- **Import/Export**: Support for .env and JSON formats
- **Migration**: Move secrets between storage backends

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Secret Management Service                  │
│                    (Port 3003)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ SecretService│  │ VaultService │  │ AuditService │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Encryption   │  │ Access       │  │ Lifecycle    │ │
│  │ Service      │  │ Control      │  │ Management   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ Event        │  │ Logging      │                   │
│  │ Publisher    │  │ Client       │                   │
│  └──────────────┘  └──────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    RabbitMQ            Logging Service      PostgreSQL
  (Notifications)      (Port 3014)        (Shared DB)
```

## API Reference

See [OpenAPI Specification](./docs/openapi.yaml) for complete API documentation.

Interactive API documentation is available at `/docs` when the service is running.

### API Endpoints

### Secret Management
- `POST /api/secrets` - Create secret
- `GET /api/secrets` - List secrets (metadata only)
- `GET /api/secrets/:id` - Get secret metadata
- `GET /api/secrets/:id/value` - Get secret value
- `PUT /api/secrets/:id` - Update secret metadata
- `PUT /api/secrets/:id/value` - Update secret value
- `DELETE /api/secrets/:id` - Soft delete secret
- `POST /api/secrets/:id/restore` - Restore soft-deleted secret
- `DELETE /api/secrets/:id/permanent` - Permanently delete secret

### Secret Resolution
- `POST /api/secrets/resolve` - Batch resolve multiple secrets (up to 100)
- `POST /api/secrets/resolve/config` - Resolve configuration with secret references

### Rotation & Versioning
- `POST /api/secrets/:id/rotate` - Rotate secret
- `GET /api/secrets/:id/versions` - Get version history
- `GET /api/secrets/:id/versions/:version` - Get specific version
- `POST /api/secrets/:id/rollback` - Rollback to previous version

### Access Management
- `GET /api/secrets/:id/access` - List access grants
- `POST /api/secrets/:id/access` - Grant access
- `DELETE /api/secrets/:id/access/:grantId` - Revoke access

### Vault Configuration
- `GET /api/vaults` - List vault configurations
- `POST /api/vaults` - Create vault configuration
- `GET /api/vaults/:id` - Get vault configuration
- `PUT /api/vaults/:id` - Update vault configuration
- `DELETE /api/vaults/:id` - Delete vault configuration
- `POST /api/vaults/:id/health` - Check vault health
- `POST /api/vaults/:id/default` - Set as default vault

### Import/Export
- `POST /api/secrets/import/env` - Import from .env file
- `POST /api/secrets/import/json` - Import from JSON
- `GET /api/secrets/export` - Export secrets
- `POST /api/secrets/migrate` - Migrate secrets between backends

### Audit
- `GET /api/secrets/audit` - List audit logs
- `GET /api/secrets/audit/:id` - Get audit log details
- `GET /api/secrets/compliance/report` - Generate compliance report

### SSO Secrets (Service-to-service)
- `POST /api/secrets/sso` - Store SSO secret
- `GET /api/secrets/sso/:secretId` - Get SSO secret
- `PUT /api/secrets/sso/:secretId` - Update SSO secret
- `DELETE /api/secrets/sso/:secretId` - Delete SSO secret
- `POST /api/secrets/sso/:secretId/rotate` - Rotate SSO certificate
- `GET /api/secrets/sso/:secretId/expiration` - Check certificate expiration

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- RabbitMQ 3.12+ (optional, for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
# Copy default config (already included)
# Edit config/default.yaml or create environment-specific overrides
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration Reference

Configuration is managed through YAML files in the `config/` directory. Environment variables can override values using `${VAR:-default}` syntax.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3003 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `server.env` | string | development | Environment (development/test/production) |
| `database.url` | string | - | PostgreSQL connection string (required) |
| `encryption.masterKey` | string | - | 64 hex characters master key (required) |
| `encryption.algorithm` | string | AES-256-GCM | Encryption algorithm |
| `encryption.keyRotation.enabled` | boolean | true | Enable key rotation |
| `encryption.keyRotation.intervalDays` | number | 90 | Key rotation interval |
| `service.authToken` | string | - | Service-to-service auth token (required) |
| `rabbitmq.url` | string | - | RabbitMQ connection URL |
| `rabbitmq.exchange` | string | coder_events | RabbitMQ exchange name |
| `logging.serviceUrl` | string | - | Logging service URL |
| `logging.enabled` | boolean | true | Enable logging integration |
| `logging.level` | string | info | Log level (debug/info/warn/error) |
| `secrets.defaultBackend` | string | LOCAL_ENCRYPTED | Default storage backend |
| `secrets.cache.enabled` | boolean | true | Enable secret caching |
| `secrets.cache.ttlSeconds` | number | 300 | Cache TTL in seconds |
| `secrets.cache.maxSize` | number | 1000 | Maximum cached secrets |
| `secrets.softDelete.recoveryPeriodDays` | number | 30 | Soft delete recovery period |
| `secrets.rotation.defaultIntervalDays` | number | 90 | Default rotation interval |
| `secrets.expiration.notificationDays` | array | [30, 14, 7, 1] | Days before expiration to notify |
| `services.logging.url` | string | - | Logging service URL (from config) |
| `services.notification.url` | string | - | Notification service URL (from config) |

### Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_MASTER_KEY` - 64-character hex-encoded master key (generate with `openssl rand -hex 32`)
- `SERVICE_AUTH_TOKEN` - Token for service-to-service authentication

### Optional Environment Variables

All configuration can be overridden via environment variables. See `config/default.yaml` for available options.

## Secret Types

- `API_KEY` - Simple string API key
- `OAUTH2_TOKEN` - OAuth2 access + refresh tokens
- `USERNAME_PASSWORD` - Username/password pair
- `CERTIFICATE` - TLS/SSL certificate
- `SSH_KEY` - SSH private/public key pair
- `CONNECTION_STRING` - Database connection string
- `JSON_CREDENTIAL` - JSON-formatted credentials (GCP service account)
- `ENV_VARIABLE_SET` - Set of environment variables
- `GENERIC` - Generic secret string

## Secret Scopes

- `GLOBAL` - Platform-wide (Super Admin only)
- `ORGANIZATION` - Organization-level
- `TEAM` - Team-level
- `PROJECT` - Project-level
- `USER` - Personal/user-level

## Development

### Running Tests

```bash
npm test           # All tests
npm run test:unit  # Unit tests only
npm run test:int   # Integration tests
```

### Code Style

```bash
npm run lint       # Check linting
npm run lint:fix   # Fix linting issues
```

## Security Considerations

1. **Never log secret values** - Only metadata is logged
2. **Encryption at rest** - All secrets encrypted with AES-256-GCM
3. **Access control** - RBAC + explicit grants
4. **Audit trail** - All operations logged
5. **Soft delete** - 30-day recovery period
6. **Key rotation** - Support for encryption key rotation

## Events

### Published Events

The Secret Management Service publishes events to RabbitMQ exchange `coder_events`:

| Event | Description | Payload |
|-------|-------------|---------|
| `secret.created` | Secret was created | `{ secretId, name, type, scope, organizationId }` |
| `secret.updated` | Secret metadata was updated | `{ secretId, changes }` |
| `secret.deleted` | Secret was soft-deleted | `{ secretId, recoveryDeadline }` |
| `secret.restored` | Secret was restored from soft delete | `{ secretId }` |
| `secret.permanently_deleted` | Secret was permanently deleted | `{ secretId }` |
| `secret.rotated` | Secret was rotated | `{ secretId, newVersion }` |
| `secret.expiring_soon` | Secret expiring within notification window | `{ secretId, daysUntilExpiration }` |
| `secret.expired` | Secret has expired | `{ secretId }` |
| `secret.access.granted` | Access was granted to a secret | `{ secretId, granteeType, granteeId }` |
| `secret.access.revoked` | Access was revoked | `{ secretId, grantId }` |
| `vault.configured` | Vault configuration was created | `{ vaultId, backend, scope }` |
| `vault.health_check` | Vault health check performed | `{ vaultId, status }` |
| `secrets.imported` | Secrets were imported | `{ count, format, scope }` |
| `secrets.exported` | Secrets were exported | `{ count, format }` |
| `secrets.migrated` | Secrets were migrated between backends | `{ sourceBackend, targetBackend, count }` |

### Consumed Events

The Secret Management Service consumes events from RabbitMQ:

| Event | Handler | Description |
|-------|---------|-------------|
| `user.deleted` | Cleanup user secrets | Remove user's personal secrets when user is deleted |
| `organization.deleted` | Cleanup org secrets | Remove organization secrets when org is deleted |
| `team.deleted` | Cleanup team secrets | Remove team secrets when team is deleted |
| `project.deleted` | Cleanup project secrets | Remove project secrets when project is deleted |

## Integration

### Notification Module
Events are published to RabbitMQ exchange `coder_events` for notification triggers (expiration warnings, rotation reminders, etc.).

### Logging Module
Operational logs are sent to Logging Service:
- Request/response logging
- Error logging
- Operation logging
- Access denial logging

## License

Proprietary - Castiel
