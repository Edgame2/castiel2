# Authentication Module

User authentication and session management service for Castiel.

## Features

- **Multi-Provider Authentication**: Email/password, Google OAuth, GitHub OAuth, SAML/SSO
- **JWT Token Management**: Secure token generation, validation, and refresh
- **Session Management**: Multi-device session tracking and revocation
- **Password Security**: Bcrypt hashing, password history, strength validation
- **Account Security**: Login attempt tracking, account lockout, email verification
- **Provider Linking**: Link/unlink multiple authentication providers
- **Password Reset**: Secure password reset flow with email verification
- **Event-Driven Email Notifications**: All emails are sent via the Notification module through RabbitMQ events

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing to Notification module)
- Notification Manager Service (for sending emails)

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

- `auth_sessions` - User session data
- `auth_tokens` - Refresh tokens
- `auth_providers` - Linked OAuth/SSO providers
- `auth_password_resets` - Password reset tokens (TTL: 1 hour)
- `auth_email_verifications` - Email verification tokens (TTL: 24 hours)
- `auth_login_attempts` - Login attempt tracking (TTL: 15 minutes)
- `auth_sso_configs` - SSO/SAML configurations
- `auth_oauth2_clients` - OAuth2 client applications
- `auth_mfa_secrets` - MFA secrets (encrypted)

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
| server.port | number | 3021 | Server port |
| server.host | string | 0.0.0.0 | Server host |
| database.url | string | - | Cosmos DB connection string (required) |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| cosmos_db.database_id | string | castiel | Cosmos DB database ID (shared database) |
| jwt.secret | string | - | JWT secret key (required) |
| jwt.expiration | string | 7d | JWT token expiration |
| oauth.google.enabled | boolean | false | Enable Google OAuth |
| oauth.github.enabled | boolean | false | Enable GitHub OAuth |
| password.min_length | number | 8 | Minimum password length |
| security.max_login_attempts | number | 5 | Max failed login attempts before lockout |

See `config/default.yaml` for full configuration options.

## API Reference

See [OpenAPI Specification](./docs/openapi.yaml)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |
| POST | `/api/v1/auth/logout` | Logout and revoke session |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| POST | `/api/v1/auth/change-password` | Change password |
| POST | `/api/v1/auth/request-password-reset` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET | `/api/v1/auth/providers` | Get linked providers |
| POST | `/api/v1/auth/link-google` | Link Google account |
| POST | `/api/v1/auth/unlink-provider` | Unlink provider |
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |

## Email Notifications

The Authentication module **does not send emails directly**. All email notifications are sent through the **Notification Manager Service** via event-driven architecture:

1. **Authentication module publishes events** to RabbitMQ when email notifications are needed
2. **Notification Manager Service consumes events** and sends emails using configured email providers (SendGrid, SMTP, AWS SES)

### Email Events Published

- `user.registered` - Welcome email when user registers
- `user.email_verification_requested` - Email verification link
- `user.email_verified` - Email verification confirmation
- `user.password_reset_requested` - Password reset link
- `user.password_reset_success` - Password reset confirmation
- `user.password_changed` - Password change confirmation
- `auth.login.success` - Security notifications (new device/location)
- `user.provider_linked` - Provider linking confirmation
- `user.provider_unlinked` - Provider unlinking confirmation

See [Notifications Events Documentation](./docs/notifications-events.md) for complete event schemas.

### Configuration

The Notification Manager Service URL is configured in `config/default.yaml`:

```yaml
services:
  notification:
    url: ${NOTIFICATION_MANAGER_URL:-http://localhost:3001}
```

## Events

For detailed event documentation including schemas and examples, see:
- [Logs Events](./docs/logs-events.md) - Events that get logged
- [Notifications Events](./docs/notifications-events.md) - Events that trigger notifications

### Published Events

| Event | Description |
|-------|-------------|
| `user.registered` | User account created |
| `auth.login.success` | Successful login |
| `auth.login.failed` | Failed login attempt |
| `user.logged_out` | User logged out |
| `user.password_changed` | Password changed |
| `user.password_reset_requested` | Password reset requested |
| `user.password_reset_success` | Password reset completed |
| `user.email_verified` | Email verified |
| `user.provider_linked` | Auth provider linked |
| `user.provider_unlinked` | Auth provider unlinked |
| `session.revoked` | Session revoked |
| `sessions.bulk_revoked` | Multiple sessions revoked |

### Consumed Events

The Authentication module does not consume events from other modules.

## Development

### Running Tests

The module uses Vitest for testing. Tests are located in the `tests/` directory.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/utils/passwordUtils.test.ts
```

#### Test Structure

```
tests/
├── setup.ts                    # Global test setup and mocks
├── fixtures/                   # Test data fixtures
│   └── users.ts               # User test data
├── unit/                       # Unit tests
│   ├── utils/                 # Utility function tests
│   │   └── passwordUtils.test.ts
│   └── services/             # Service tests
│       ├── PasswordResetService.test.ts
│       ├── SessionService.test.ts
│       ├── EmailVerificationService.test.ts
│       └── AuthProviderService.test.ts
└── integration/               # Integration tests
    └── routes/               # API route tests
        └── auth.test.ts
```

#### Test Coverage

The test suite covers:
- ✅ Password utilities (hashing, verification, validation)
- ✅ Password reset service (token creation, validation, expiration)
- ✅ Session service (session creation, device fingerprinting)
- ✅ Email verification service (token management, verification flow)
- ✅ Auth provider service (linking/unlinking providers)
- ✅ Authentication routes (registration, login, error handling)

Coverage thresholds are set at:
- Lines: 70%
- Functions: 70%
- Branches: 60%
- Statements: 70%

#### Test Environment

Tests use mocked dependencies:
- Database client (Prisma)
- Redis client
- Event publisher (RabbitMQ)
- External services (Logging, Notification)
- JWT signing

Set the following environment variables for test execution:
- `TEST_DATABASE_URL` - Test database connection (optional)
- `TEST_JWT_SECRET` - JWT secret for tests (optional, defaults to test value)
- `TEST_RABBITMQ_URL` - RabbitMQ URL for tests (optional)

### Code Style

```bash
npm run lint       # Check linting
npm run lint:fix   # Fix linting issues
```

## Dependencies

- **User Management**: For user profile operations
- **Logging**: For audit logging
- **Notification**: For email notifications (password reset, verification)
- **Secret Management**: For storing OAuth secrets (future)

## Security Considerations

1. **Tokens**: JWT tokens expire after 7 days (configurable)
2. **Cookies**: HttpOnly cookies used for token storage
3. **HTTPS**: Required in production
4. **Password**: Minimum strength requirements enforced
5. **Account Locking**: Accounts locked after failed login attempts
6. **Session Management**: Multi-device session tracking and revocation

## License

Proprietary


