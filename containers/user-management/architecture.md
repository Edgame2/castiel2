# User Management Module - Architecture

## Overview

The User Management module provides user profiles, organizations, teams, roles, and permissions management for the Coder IDE system. This module has been migrated from PostgreSQL to Azure Cosmos DB NoSQL to align with the system's database architecture.

## Database Architecture

### Cosmos DB NoSQL Migration

**Previous State**: PostgreSQL with Prisma ORM  
**Current State**: Azure Cosmos DB NoSQL (shared database, prefixed containers)

### Container Structure

The User Management module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description | Unique Keys | TTL |
|----------------|---------------|-------------|-------------|-----|
| `user_users` | `/partitionKey` | User accounts and profiles | `['/email']` | - |
| `user_organizations` | `/partitionKey` | Organization definitions and settings | - | - |
| `user_teams` | `/organizationId` | Team definitions and membership | - | - |
| `user_roles` | `/tenantId` | User roles and permissions | `['/tenantId', '/name']` | - |
| `user_role_idp_mappings` | `/tenantId` | Role to Identity Provider group mappings | - | - |
| `user_tenant_invitations` | `/tenantId` | Invitations to join tenants | - | 7 days |
| `user_tenant_join_requests` | `/tenantId` | Requests to join tenants | - | - |
| `user_organization_memberships` | `/organizationId` | Organization membership records | `['/organizationId', '/userId']` | - |
| `user_team_memberships` | `/teamId` | Team membership records | `['/teamId', '/userId']` | - |
| `user_external_ids` | `/userId` | External user ID mappings from integrations | - | - |

**Note**: The `users` container is shared with Authentication module for user accounts. User Management module manages profiles, organizations, teams, and memberships.

### Partition Key Strategy

- **Users**: Partitioned by `/partitionKey` (same as `tenantId` for tenant isolation)
- **Organizations**: Partitioned by `/partitionKey` (same as `organizationId`)
- **Teams**: Partitioned by `/organizationId` for efficient org-scoped queries
- **Roles**: Partitioned by `/tenantId` for tenant isolation
- **Memberships**: Partitioned by parent entity (`/organizationId` or `/teamId`) for efficient queries

### Indexing Strategy

**Required Composite Indexes**:

```json
{
  "compositeIndexes": [
    [
      { "path": "/organizationId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/name", "order": "ascending" }
    ],
    [
      { "path": "/organizationId", "order": "ascending" },
      { "path": "/userId", "order": "ascending" }
    ],
    [
      { "path": "/teamId", "order": "ascending" },
      { "path": "/userId", "order": "ascending" }
    ]
  ]
}
```

## Service Architecture

### Core Services

1. **UserService** - User profile management
   - Profile CRUD operations
   - User preferences and settings
   - External user ID mapping

2. **OrganizationService** - Organization management
   - Organization CRUD operations
   - Organization settings
   - Member management

3. **TeamService** - Team management
   - Team CRUD operations
   - Team membership
   - Team hierarchy

4. **RoleService** - RBAC management
   - Role CRUD operations
   - Permission management
   - Role assignments

5. **InvitationService** - User invitations
   - Invitation creation and management
   - Invitation acceptance flow
   - Expiration handling

6. **MembershipService** - Membership management
   - Organization membership
   - Team membership
   - Membership history

### Data Flow

```
User Request
    ↓
Authorization Middleware (RBAC)
    ↓
Service Layer (User/Org/Team/Role)
    ↓
Cosmos DB Repository
    ↓
Event Publisher (RabbitMQ)
    ↓
Response
```

## Event-Driven Architecture

### RabbitMQ Integration

- **Exchange**: `coder_events` (topic exchange)
- **Queue**: `user_management_service`
- **Routing Patterns**: 
  - `user.*` - User-related events
  - `organization.*` - Organization events
  - `team.*` - Team events
  - `role.*` - Role events
  - `invitation.*` - Invitation events

### Event Publishing

All user management events are published to RabbitMQ for:
- Audit logging (consumed by Logging module)
- Email notifications (consumed by Notification Manager)
- Real-time updates (consumed by frontend)

### Event Consumption

The module consumes events from:
- **Authentication module**: `auth.login.success`, `auth.login.failed`, `user.registered`
- **Integration modules**: External user ID updates

See [logs-events.md](./docs/logs-events.md) and [notifications-events.md](./docs/notifications-events.md) for complete event documentation.

## Security Architecture

### RBAC (Role-Based Access Control)

- **Roles**: Defined per tenant/organization
- **Permissions**: Granular permission system
- **Role Assignments**: User-role mappings stored in membership records
- **Permission Checks**: Middleware validates permissions on all operations

### Data Isolation

- **Tenant Isolation**: All queries filtered by `tenantId` or `organizationId`
- **Partition Key**: Ensures data isolation at Cosmos DB level
- **Multi-tenancy**: Support for users belonging to multiple organizations

## Migration from PostgreSQL

### Schema Changes

**Before (PostgreSQL)**:
- Tables: `users`, `organizations`, `teams`, `roles`, `memberships`, etc.
- Relational structure with foreign keys
- Prisma ORM for data access

**After (Cosmos DB NoSQL)**:
- Containers: `user_users`, `user_organizations`, `user_teams`, etc.
- Document-based structure
- Direct Cosmos DB SDK usage
- Prefixed container names for module isolation

### Data Migration Notes

- **Users**: Migrate all user profiles (shared with Auth module)
- **Organizations**: Migrate all organizations with settings
- **Teams**: Migrate all teams with hierarchy
- **Roles**: Migrate all roles and permissions
- **Memberships**: Migrate all organization and team memberships
- **Invitations**: Migrate active invitations only (expired invitations can be recreated)

### Query Pattern Changes

**PostgreSQL** (relational):
```sql
SELECT u.*, o.name as org_name 
FROM users u 
JOIN organization_memberships om ON u.id = om.user_id 
JOIN organizations o ON om.organization_id = o.id 
WHERE u.id = $1;
```

**Cosmos DB** (document):
```typescript
// Query users
const userQuery = {
  query: 'SELECT * FROM c WHERE c.id = @userId',
  parameters: [{ name: '@userId', value: userId }]
};

// Query memberships separately
const membershipQuery = {
  query: 'SELECT * FROM c WHERE c.userId = @userId',
  parameters: [{ name: '@userId', value: userId }]
};
```

## Dependencies

### External Services

- **Authentication**: User authentication and session management (via REST API)
- **Logging**: Audit trail (via RabbitMQ events)
- **Notification Manager**: Invitation emails and notifications (via RabbitMQ events)
- **Secret Management**: Organization secrets storage (future)

### Infrastructure

- **Cosmos DB**: Shared database, prefixed containers
- **RabbitMQ**: Event publishing and consumption (`coder_events` exchange)

## Performance Considerations

### Cosmos DB Optimization

1. **Partition Key Selection**: Optimized for common query patterns
2. **Indexing**: Composite indexes for join-like queries
3. **TTL**: Automatic expiration for invitations
4. **Request Units**: Monitor RU consumption, optimize queries

### Caching Strategy

- **User Profiles**: Cache frequently accessed profiles
- **Role Permissions**: Cache role-permission mappings
- **Organization Settings**: Cache organization settings

## Scalability

- **Horizontal Scaling**: Cosmos DB auto-scales based on RU configuration
- **Partition Distribution**: Even distribution via partition keys
- **Multi-tenancy**: Efficient tenant isolation via partition keys

## Monitoring

- **Health Endpoints**: `/health` (liveness), `/ready` (readiness)
- **Metrics**: User creation rate, organization growth, membership changes
- **Logging**: Structured logging for all user management events
- **Audit Trail**: All events published to RabbitMQ for logging

## Future Enhancements

- User activity analytics
- Advanced permission inheritance
- Organization templates
- Bulk user operations
- User import/export

