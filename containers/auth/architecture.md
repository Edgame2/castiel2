# Authentication Module - Architecture

## Overview

The Authentication module provides identity verification and session lifecycle management for the Castiel system. This module has been migrated from PostgreSQL to Azure Cosmos DB NoSQL to align with the system's database architecture.

## Database Architecture

### Cosmos DB NoSQL Migration

**Previous State**: PostgreSQL with Prisma ORM  
**Current State**: Azure Cosmos DB NoSQL (shared database, prefixed containers)

### Container Structure

The Authentication module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description | Unique Keys |
|----------------|---------------|-------------|-------------|
| `auth_sessions` | `/userId` | User session data (JWT tokens, device info, expiration) | - |
| `auth_tokens` | `/userId` | Refresh tokens and token metadata | - |
| `auth_providers` | `/userId` | Linked OAuth/SSO provider information | `['/userId', '/provider']` |
| `auth_password_resets` | `/userId` | Password reset tokens (TTL: 1 hour) | - |
| `auth_email_verifications` | `/userId` | Email verification tokens (TTL: 24 hours) | - |
| `auth_login_attempts` | `/userId` | Login attempt tracking for account lockout (TTL: 15 minutes) | - |
| `auth_sso_configs` | `/tenantId` | SSO/SAML provider configurations per tenant | `['/tenantId', '/provider']` |
| `auth_oauth2_clients` | `/tenantId` | OAuth2 client applications | `['/tenantId', '/clientId']` |
| `auth_mfa_secrets` | `/userId` | MFA secrets and backup codes (encrypted) | - |

**Note**: User accounts are stored in `user_users` container (User Management module). Authentication module only manages authentication-specific data.

### Partition Key Strategy

- **Sessions & Tokens**: Partitioned by `/userId` for efficient user-scoped queries
- **SSO/OAuth Configs**: Partitioned by `/tenantId` for tenant isolation
- **Login Attempts**: Partitioned by `/userId` for rate limiting queries

### Indexing Strategy

**Required Composite Indexes**:

```json
{
  "compositeIndexes": [
    [
      { "path": "/userId", "order": "ascending" },
      { "path": "/expiresAt", "order": "ascending" }
    ],
    [
      { "path": "/userId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/provider", "order": "ascending" }
    ]
  ]
}
```

## Service Architecture

### Core Services

1. **SessionService** - Session lifecycle management
   - Creates, validates, and revokes sessions
   - Device fingerprinting
   - Multi-device session tracking

2. **AuthProviderService** - OAuth/SSO provider management
   - Provider linking/unlinking
   - OAuth flow handling
   - SAML/SSO integration

3. **PasswordResetService** - Password reset flow
   - Token generation and validation
   - Secure token storage with TTL

4. **EmailVerificationService** - Email verification
   - Verification token management
   - Email verification flow

5. **LoginAttemptService** - Account security
   - Login attempt tracking
   - Account lockout logic
   - Rate limiting

### Data Flow

```
User Request
    ↓
Authentication Middleware
    ↓
SessionService (validate session)
    ↓
AuthProviderService (if OAuth/SSO)
    ↓
Event Publisher (RabbitMQ)
    ↓
Response
```

## Event-Driven Architecture

### RabbitMQ Integration

- **Exchange**: `coder_events` (topic exchange)
- **Queue**: `auth_service`
- **Routing Patterns**: 
  - `auth.*` - Authentication events
  - `user.*` - User-related events
  - `session.*` - Session events

### Event Publishing

All authentication events are published to RabbitMQ for:
- Audit logging (consumed by Logging module)
- Email notifications (consumed by Notification Manager)
- User management updates (consumed by User Management module)

See [logs-events.md](./docs/logs-events.md) and [notifications-events.md](./docs/notifications-events.md) for complete event documentation.

## Security Architecture

### Token Management

- **JWT Access Tokens**: Short-lived (7 days default), stored in HttpOnly cookies
- **Refresh Tokens**: Long-lived (30 days default), stored in `auth_tokens` container
- **Password Reset Tokens**: Short-lived (1 hour), stored in `auth_password_resets` container
- **Email Verification Tokens**: Short-lived (24 hours), stored in `auth_email_verifications` container

### Password Security

- **Hashing**: Bcrypt with cost factor 12
- **History**: Last 5 passwords stored (prevent reuse)
- **Strength Validation**: Configurable requirements (length, complexity)

### Account Security

- **Login Attempt Tracking**: Stored in `auth_login_attempts` container with TTL
- **Account Lockout**: After 5 failed attempts (configurable)
- **Session Management**: Multi-device tracking, revocation capabilities

## Migration from PostgreSQL

### Schema Changes

**Before (PostgreSQL)**:
- Tables: `sessions`, `tokens`, `providers`, `password_resets`, etc.
- Relational structure with foreign keys
- Prisma ORM for data access

**After (Cosmos DB NoSQL)**:
- Containers: `auth_sessions`, `auth_tokens`, `auth_providers`, etc.
- Document-based structure
- Direct Cosmos DB SDK usage
- Prefixed container names for module isolation

### Data Migration Notes

- Session data: Migrate active sessions only (expired sessions can be recreated)
- Tokens: Migrate refresh tokens, invalidate old access tokens
- Providers: Migrate all linked provider information
- Password resets: Do not migrate (tokens expire quickly)
- Email verifications: Do not migrate (tokens expire quickly)

### Query Pattern Changes

**PostgreSQL** (relational):
```sql
SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW();
```

**Cosmos DB** (document):
```typescript
const query = {
  query: 'SELECT * FROM c WHERE c.userId = @userId AND c.expiresAt > @now',
  parameters: [
    { name: '@userId', value: userId },
    { name: '@now', value: new Date().toISOString() }
  ]
};
```

## Dependencies

### External Services

- **User Management**: User profile operations (via REST API)
- **Logging**: Audit trail (via RabbitMQ events)
- **Notification Manager**: Email notifications (via RabbitMQ events)
- **Secret Management**: OAuth secrets storage (future)

### Infrastructure

- **Cosmos DB**: Shared database, prefixed containers
- **RabbitMQ**: Event publishing (`coder_events` exchange)
- **Redis**: Session caching (optional, for performance)

## Performance Considerations

### Cosmos DB Optimization

1. **Partition Key Selection**: `/userId` for user-scoped queries
2. **Indexing**: Composite indexes for common query patterns
3. **TTL**: Automatic expiration for temporary data (tokens, attempts)
4. **Request Units**: Monitor RU consumption, optimize queries

### Caching Strategy

- **Redis**: Cache active sessions (optional)
- **TTL**: Use Cosmos DB TTL for token expiration
- **Cache Invalidation**: On session revocation events

## Scalability

- **Horizontal Scaling**: Cosmos DB auto-scales based on RU configuration
- **Partition Distribution**: Even distribution via `/userId` partition key
- **Session Cleanup**: Background job for expired session cleanup

## Monitoring

- **Health Endpoints**: `/health` (liveness), `/ready` (readiness)
- **Metrics**: Session creation rate, login success/failure rate
- **Logging**: Structured logging for all authentication events
- **Audit Trail**: All events published to RabbitMQ for logging

## Future Enhancements

- MFA support (TOTP, SMS, authenticator apps)
- Biometric authentication
- Risk-based authentication
- Adaptive authentication based on device/location

