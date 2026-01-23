# Architecture Overview

This document provides an overview of the User Management System architecture.

## System Components

### Backend

- **Fastify Server**: HTTP API server
- **Prisma ORM**: Database access layer
- **Redis**: Caching, sessions, queues
- **Bull/BullMQ**: Background job processing
- **PostgreSQL**: Primary database

### Frontend

- **React**: UI framework
- **Electron**: Desktop application wrapper
- **IPC**: Inter-process communication between renderer and main process
- **Context API**: State management

## Architecture Patterns

### Service Layer Pattern

All business logic is encapsulated in service modules:

```
server/src/services/
├── userService.ts          # User management
├── organizationService.ts  # Organization CRUD
├── roleService.ts         # Role management
├── permissionService.ts   # Permission checking
├── membershipService.ts   # Membership operations
├── invitationService.ts   # Invitation flow
├── sessionService.ts      # Session management
├── auditService.ts       # Audit logging
└── ...
```

**Benefits:**
- Separation of concerns
- Reusable business logic
- Easier testing
- Clear API boundaries

### Repository Pattern (via Prisma)

Prisma Client acts as the repository layer:

```typescript
const db = getDatabaseClient();
const user = await db.user.findUnique({ where: { id } });
```

### Middleware Pattern

Request processing pipeline:

```
Request → Auth Middleware → RBAC Middleware → Route Handler → Response
```

**Middleware Stack:**
1. **Authentication**: Verify JWT token
2. **Authorization**: Check permissions (RBAC)
3. **Rate Limiting**: Prevent abuse
4. **Validation**: Validate request data
5. **Error Handling**: Catch and format errors

## Data Flow

### Authentication Flow

```
1. User submits credentials
2. Auth service validates
3. Session service creates JWT
4. Token stored in Redis (session)
5. Token returned to client
6. Client includes token in subsequent requests
```

### Permission Check Flow

```
1. Request arrives with JWT
2. Auth middleware extracts user
3. RBAC middleware checks permission
4. Permission service:
   a. Check if Super Admin (bypass)
   b. Get user's role permissions
   c. Resolve wildcards
   d. Check scope (all/org/team/own)
   e. Check resource-level permissions
5. Grant or deny access
```

### Invitation Flow

```
1. Admin creates invitation
2. Invitation stored in database
3. Email job queued (Bull)
4. Email processor sends email
5. User clicks link
6. Accept invitation endpoint:
   a. Validate token
   b. Check expiration
   c. Find or create user
   d. Create membership
   e. Mark invitation accepted
   f. Send welcome email (if new user)
```

## Database Schema

### Core Entities

- **User**: User accounts
- **Organization**: Organizations
- **Role**: Roles (system and custom)
- **Permission**: System permissions
- **RolePermission**: Role-permission assignments
- **OrganizationMembership**: User-organization-role relationships
- **Invitation**: Pending invitations
- **Session**: Active user sessions
- **AuditLog**: Audit trail

### Relationships

```
User ──< OrganizationMembership >── Organization
                │
                └── Role ──< RolePermission >── Permission
```

### Soft Deletes

Entities with soft delete support:
- User (`deletedAt`)
- Organization (`deletedAt`)
- OrganizationMembership (`deletedAt`)

**Implementation**: Prisma Client Extensions automatically filter `deletedAt: null`

## Caching Strategy

### Redis Cache Keys

```
user:{userId}:org:{orgId}:permissions  # User permissions (5 min TTL)
org:{orgId}:roles                      # Organization roles (10 min TTL)
org:{orgId}:member-count              # Member count (5 min TTL)
```

### Cache Invalidation

Cache invalidation triggers:
- Role permissions updated
- User role changed
- Membership created/removed
- Organization updated

**Service**: `cacheService.ts` centralizes invalidation logic

## Background Jobs

### Email Queue

Jobs:
- `send-invitation`: Send invitation emails
- `send-welcome`: Send welcome emails
- `send-password-reset`: Send password reset emails

**Processor**: `emailProcessor.ts`

### Audit Archive Queue

Jobs:
- `archive-audit-logs`: Move old logs to S3

**Processor**: `auditArchiveProcessor.ts`

## Security

### Authentication

- **JWT Tokens**: Stateless authentication
- **Refresh Tokens**: Long-lived token refresh
- **Session Management**: Redis-backed sessions
- **Device Fingerprinting**: Track devices
- **Token Rotation**: Automatic refresh

### Authorization

- **RBAC**: Role-based access control
- **Permission Scopes**: all/organization/team/own
- **Wildcard Permissions**: Module/resource wildcards
- **Resource-Level Permissions**: Optional fine-grained control

### Security Features

- **Password Hashing**: Bcrypt (10 rounds)
- **Password History**: Prevent reuse
- **HIBP Integration**: Breach checking
- **Rate Limiting**: Prevent brute force
- **Account Lockout**: After failed attempts
- **CSRF Protection**: Token validation
- **Re-authentication**: For sensitive operations

## Multi-Organization Support

### Organization Context

Every request includes organization context:
- JWT token contains `organizationId`
- Permissions checked within organization
- Data scoped to organization

### Organization Switching

```
1. User requests organization switch
2. Session service validates membership
3. New JWT issued with new organizationId
4. Client updates token
5. All subsequent requests use new context
```

## Error Handling

### Error Types

- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Not Found Errors**: 404 Not Found
- **Rate Limit Errors**: 429 Too Many Requests
- **Server Errors**: 500 Internal Server Error

### Error Format

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": "Additional details (dev only)"
}
```

## Testing Strategy

### Unit Tests

- **Services**: All business logic
- **Utilities**: Helper functions
- **Middleware**: Request processing

**Framework**: Vitest
**Mocking**: Prisma, Redis, Email Service

### Integration Tests

- **End-to-end flows**: Authentication, invitations, permissions
- **Real database**: Transaction rollback for isolation
- **Service integration**: Multiple services working together

**Framework**: Vitest
**Database**: Test database with transactions

## Deployment

### Environment Variables

See [Environment Variables](../../server/ENVIRONMENT_VARIABLES.md)

### Database Migrations

```bash
npm run db:migrate
```

### Redis Setup

- Standalone or cluster
- Persistent storage recommended
- Connection pooling

### Monitoring

- **Logging**: Structured JSON logs
- **Metrics**: Prometheus-compatible
- **Health Checks**: `/health` endpoint
- **Audit Logs**: All admin actions

## Performance Considerations

### Database

- **Indexes**: On foreign keys and frequently queried fields
- **Connection Pooling**: Prisma connection pool
- **Query Optimization**: Eager loading where needed

### Caching

- **Permission Cache**: 5-minute TTL
- **Role Cache**: 10-minute TTL
- **Member Count Cache**: 5-minute TTL

### Background Jobs

- **Async Processing**: Email sending, audit archival
- **Retry Logic**: Exponential backoff
- **Dead Letter Queue**: Failed jobs

## Scalability

### Horizontal Scaling

- **Stateless API**: JWT tokens, Redis sessions
- **Load Balancing**: Multiple API instances
- **Database Replication**: Read replicas

### Vertical Scaling

- **Connection Pooling**: Database connections
- **Redis Clustering**: Session storage
- **Queue Workers**: Multiple processors

## Future Enhancements

- **Two-Factor Authentication**: TOTP/SMS
- **SAML/OIDC**: Enterprise SSO
- **Webhooks**: Event notifications
- **GraphQL API**: Alternative to REST
- **Real-time Updates**: WebSocket support
