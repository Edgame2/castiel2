# Secret Management Module - Architecture

## Overview

The Secret Management module provides secure storage, encryption, rotation, and access control for sensitive credentials and secrets. It follows the ModuleImplementationGuide.md standards for module design and implementation.

## Architecture Principles

### 1. Security First
- All secrets are encrypted at rest using AES-256
- Secrets are encrypted in transit using TLS
- Access control enforced at multiple layers
- Audit logging for all secret operations

### 2. Multi-Tenancy
- Tenant isolation enforced at database layer (partition key: `/tenantId`)
- Secrets are scoped to organizations
- Access control respects tenant boundaries

### 3. Provider Abstraction
- Pluggable encryption providers
- Support for multiple secret storage backends
- Configurable rotation policies

## Module Structure

```
secret-management/
├── config/
│   ├── default.yaml          # Configuration with environment variable support
│   └── schema.json           # JSON Schema for config validation
├── src/
│   ├── config/               # Configuration loading and validation
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   │   ├── SecretService.ts
│   │   ├── VaultService.ts
│   │   ├── RotationService.ts
│   │   └── access/           # Access control services
│   ├── utils/                # Utilities (encryption, validation)
│   └── types/                # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── setup.ts              # Test configuration
└── architecture.md           # This file
```

## Key Components

### SecretService
- Core service for secret CRUD operations
- Handles encryption/decryption
- Manages secret lifecycle
- Enforces access control

### VaultService
- Manages secret vaults (organizational containers)
- Handles vault-level permissions
- Supports vault hierarchies

### RotationService
- Automated secret rotation
- Rotation policy enforcement
- Rotation history tracking

### Access Control
- Role-based access control (RBAC)
- Secret-level permissions
- Audit trail for access

## Database Design

### Cosmos DB Containers

All containers use `/tenantId` as partition key for tenant isolation:

- `secret_secrets`: Stores encrypted secrets
- `secret_vaults`: Stores vault definitions
- `secret_access_logs`: Audit logs for secret access

### Data Model

```typescript
interface Secret {
  id: string;
  tenantId: string;           // Partition key
  vaultId: string;
  name: string;
  encryptedValue: string;
  encryptionKeyId: string;
  metadata: Record<string, any>;
  expiresAt?: Date;
  rotationPolicy?: RotationPolicy;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Design

### Endpoints

- `POST /api/v1/secrets` - Create secret
- `GET /api/v1/secrets/:id` - Get secret (decrypted)
- `PUT /api/v1/secrets/:id` - Update secret
- `DELETE /api/v1/secrets/:id` - Delete secret
- `POST /api/v1/secrets/:id/rotate` - Rotate secret
- `GET /api/v1/vaults` - List vaults
- `POST /api/v1/vaults` - Create vault

All endpoints require:
- JWT authentication
- X-Tenant-ID header
- Appropriate RBAC permissions

## Security Considerations

### Encryption
- Secrets encrypted using AES-256-GCM
- Encryption keys managed separately
- Key rotation supported

### Access Control
- Multi-layer access control:
  1. Authentication (JWT)
  2. Tenant isolation (X-Tenant-ID)
  3. RBAC permissions
  4. Secret-level ACLs

### Audit Logging
- All secret operations logged
- Access attempts tracked
- Rotation events recorded
- Logs sent to Logging module

## Service Communication

### Consumes Services
- **User Management**: For user/role validation
- **Logging**: For audit log storage

### Published Events
- `secret.created`
- `secret.updated`
- `secret.deleted`
- `secret.rotated`
- `secret.accessed`
- `secret.expiring_soon`

See `logs-events.md` for complete event documentation.

## Configuration

Configuration follows ModuleImplementationGuide Section 4:
- YAML-based configuration (`config/default.yaml`)
- Environment variable support
- Schema validation (`config/schema.json`)
- No hardcoded values

## Testing

- Unit tests for all services
- Integration tests for API endpoints
- Test coverage ≥ 80%
- Tests use mocked dependencies

## Deployment

- Containerized with Docker
- Configurable via environment variables
- Health check endpoints (`/health`, `/ready`)
- Graceful shutdown support

## Related Documentation

- [README.md](./README.md) - Setup and usage
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [openapi.yaml](./openapi.yaml) - API specification
- [logs-events.md](./logs-events.md) - Event documentation
