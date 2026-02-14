# User Management Module

User profiles, teams, roles, and permissions management service for Castiel. All users and data are scoped by tenant (tenantId).

## Features

- **User Profiles**: User profile management, preferences, and settings
- **Teams**: Team creation, membership, and hierarchy (tenant-scoped)
- **RBAC**: Role-based access control with custom roles and permissions
- **Invitations**: User invitation system with expiration and tracking (tenant-scoped)
- **User Analytics**: User activity tracking and insights

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

- `user_users` - User accounts and profiles
- `user_teams` - Team definitions (partition key: tenantId)
- `user_roles` - User roles and permissions
- `user_role_idp_mappings` - Role to IdP mappings
- `user_tenant_invitations` - Tenant invitations (TTL: 7 days)
- `user_tenant_join_requests` - Join requests
- `user_memberships` - Tenant membership records
- `user_team_memberships` - Team memberships
- `user_external_ids` - External user ID mappings

See [architecture.md](./architecture.md) for container structure and partition key details.

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Seed: Default Tenant + Super Admin

To bootstrap a default tenant with a Super Admin user:

1. Set `SEED_DEFAULT_TENANT_ID` to your tenant ID (or leave unset to use a new UUID).
2. **Existing user**: Set `SEED_SUPER_ADMIN_EMAIL=<email>`. The seed promotes that user to Super Admin in the default tenant.
3. **Create user + tenant** (one-shot): Set `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`. The seed creates the default tenant, the user, and membership.

After seeding: **log out and log in again** to get a token with `tenantId` (required for protected routes).

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3022 | Server port |
| server.host | string | 0.0.0.0 | Server host |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| cosmos_db.database_id | string | castiel | Cosmos DB database ID (shared database) |
| team.max_members | number | 100 | Maximum members per team |
| invitation.expiration_days | number | 7 | Invitation expiration in days |

See `config/default.yaml` for full configuration options.

## API Reference

See [OpenAPI Specification](./openapi.yaml)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (tenant-scoped; query `tenantId`) |
| GET | `/api/v1/users/me` | Get current user profile |
| GET | `/api/v1/users/:id` | Get user profile by id (tenant + RBAC) |
| PUT | `/api/v1/users/me` | Update current user profile |
| PUT | `/api/v1/users/:id` | Admin update user profile (same tenant or Super Admin) |
| GET | `/api/v1/tenants/:tenantId/teams` | List teams for tenant |
| POST | `/api/v1/tenants/:tenantId/teams` | Create team |
| GET | `/api/v1/tenants/:tenantId/roles` | List roles for tenant |
| POST | `/api/v1/tenants/:tenantId/roles` | Create role |
| GET | `/api/v1/tenants/:tenantId/invitations` | List invitations for tenant |
| POST | `/api/v1/tenants/:tenantId/invitations` | Create invitation |
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |

## Events

For detailed event documentation including schemas and examples, see:
- [Logs Events](./docs/logs-events.md) - Events that get logged
- [Notifications Events](./docs/notifications-events.md) - Events that trigger notifications

### Published Events

| Event | Description |
|-------|-------------|
| `user.profile_updated` | User profile updated |
| `user.competency_added` | User competency added |
| `user.competency_verified` | User competency verified |
| `user.account_deleted` | User account deleted |
| `team.created` | Team created |
| `team.updated` | Team updated |
| `team.deleted` | Team deleted |
| `team.members_added` | Members added to team |
| `team.member_removed` | Member removed from team |
| `role.created` | Role created |
| `role.updated` | Role updated |
| `role.deleted` | Role deleted |
| `invitation.created` | Invitation created |
| `invitation.accepted` | Invitation accepted |
| `invitation.revoked` | Invitation revoked |
| `invitation.expired` | Invitation expired |

### Consumed Events

| Event | Handler | Description |
|-------|---------|-------------|
| `auth.login.success` | Update last login | Update user's last login timestamp |
| `auth.login.failed` | Track failed login | Track failed login attempts |
| `user.registered` | Create user profile | Initialize user profile on registration |

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

## Dependencies

- **Authentication**: For user authentication and session management
- **Logging**: For audit logging
- **Notification**: For invitation emails and notifications
- **Secret Management**: For storing tenant secrets (future)

## License

Proprietary



