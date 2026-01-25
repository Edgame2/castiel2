# User Management Module

User profiles, organizations, teams, roles, and permissions management service for Castiel.

## Features

- **User Profiles**: User profile management, preferences, and settings
- **Organizations**: Multi-tenant organization management
- **Teams**: Team creation, membership, and hierarchy
- **RBAC**: Role-based access control with custom roles and permissions
- **Invitations**: User invitation system with expiration and tracking
- **Memberships**: Organization membership management
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
- `user_organizations` - Organization definitions
- `user_teams` - Team definitions
- `user_roles` - User roles and permissions
- `user_role_idp_mappings` - Role to IdP mappings
- `user_tenant_invitations` - Tenant invitations (TTL: 7 days)
- `user_tenant_join_requests` - Join requests
- `user_organization_memberships` - Organization memberships
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

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3022 | Server port |
| server.host | string | 0.0.0.0 | Server host |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| cosmos_db.database_id | string | castiel | Cosmos DB database ID (shared database) |
| organization.max_members | number | 1000 | Maximum members per organization |
| team.max_members | number | 100 | Maximum members per team |
| invitation.expiration_days | number | 7 | Invitation expiration in days |

See `config/default.yaml` for full configuration options.

## API Reference

See [OpenAPI Specification](./docs/openapi.yaml)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| GET | `/api/v1/users/:id` | Get user profile |
| PUT | `/api/v1/users/:id` | Update user profile |
| GET | `/api/v1/organizations` | List organizations |
| POST | `/api/v1/organizations` | Create organization |
| GET | `/api/v1/organizations/:id` | Get organization |
| PUT | `/api/v1/organizations/:id` | Update organization |
| GET | `/api/v1/teams` | List teams |
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/roles` | List roles |
| POST | `/api/v1/roles` | Create role |
| GET | `/api/v1/invitations` | List invitations |
| POST | `/api/v1/invitations` | Create invitation |
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
| `organization.created` | Organization created |
| `organization.updated` | Organization updated |
| `organization.deleted` | Organization deleted |
| `organization.member_joined` | Member joined organization |
| `organization.member_role_changed` | Member role changed |
| `organization.member_removed` | Member removed from organization |
| `organization.settings_updated` | Organization settings updated |
| `organization.sso_configured` | SSO configured for organization |
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
- **Secret Management**: For storing organization secrets (future)

## License

Proprietary



