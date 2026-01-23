# Authentication Test Suite

This directory contains comprehensive test suites for the Castiel authentication system, focusing on email and password authentication with multi-tenant support.

## Test Structure

```
tests/
├── auth-email-password.test.ts  # Main authentication test suite
├── config/
│   └── test-config.ts           # Test configuration
├── fixtures/
│   └── test-data.ts             # Test data generators and fixtures
├── helpers/
│   └── test-helpers.ts          # Utility functions for tests
└── types/
    └── test-types.ts            # TypeScript type definitions
```

## Test Coverage

### API Test Suites

#### Authentication API (`auth-api.test.ts`)
- ✅ User registration with validation
- ✅ User login and authentication
- ✅ Token management (access, refresh, revocation)
- ✅ Password reset flow
- ✅ User profile management
- ✅ Rate limiting enforcement
- ✅ Multi-tenant isolation
- ✅ Security (input sanitization, SQL injection prevention, XSS prevention)

#### Project API (`project-api.test.ts`)
- ✅ Project creation with validation
- ✅ Project listing with filters and pagination
- ✅ Project retrieval by ID
- ✅ Project update (PUT and PATCH)
- ✅ Project deletion
- ✅ Project vector search
- ✅ Tenant isolation for projects
- ✅ Authentication requirements

#### AI Insights API (`ai-insights-api.test.ts`)
- ✅ Insight generation with various types
- ✅ Insight generation with project scope
- ✅ Insight generation with custom parameters
- ✅ Insight streaming
- ✅ Insight retrieval by ID
- ✅ Insight listing with pagination
- ✅ Conversation context management
- ✅ Metadata handling
- ✅ Rate limiting

#### Integration API (`integration-api.test.ts`)
- ✅ Integration catalog listing
- ✅ Tenant integration management
- ✅ Integration connection handling
- ✅ Integration search functionality
- ✅ User-scoped connections
- ✅ Authentication and authorization
- ✅ Tenant isolation

### 1. User Registration
- ✅ Successful registration with valid data
- ✅ Registration with multiple tenants
- ✅ Registration validation (email format, password strength)
- ✅ Duplicate email detection
- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ Input sanitization

### 2. Email Verification
- ✅ Email verification flow
- ✅ Invalid token handling
- ✅ Expired token handling
- ✅ Tenant validation

### 3. User Login
- ✅ Successful login with valid credentials
- ✅ Login with incorrect password
- ✅ Login with non-existent email
- ✅ Login with wrong tenant
- ✅ Email verification requirement
- ✅ Rate limiting
- ✅ Case sensitivity handling

### 4. Token Management
- ✅ Access token usage
- ✅ Token refresh flow
- ✅ Token revocation
- ✅ Token introspection
- ✅ Logout functionality
- ✅ Token expiration handling

### 5. Password Reset Flow
- ✅ Password reset request
- ✅ Password reset with token
- ✅ Invalid token handling
- ✅ Password strength validation
- ✅ Rate limiting
- ✅ Security considerations (no user enumeration)

### 6. Multi-Tenant Isolation
- ✅ Tenant data isolation
- ✅ Cross-tenant access prevention
- ✅ Tenant-specific configurations
- ✅ Session pool separation

### 7. Security Tests
- ✅ Input sanitization
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Concurrent operations
- ✅ Large payload handling
- ✅ Character encoding (UTF-8, emojis)
- ✅ Special characters

### 8. Password Complexity
- ✅ Minimum length requirement
- ✅ Uppercase requirement
- ✅ Lowercase requirement
- ✅ Number requirement
- ✅ Special character requirement

## Prerequisites

Before running the tests, ensure:

1. **Services are running**:
   ```bash
   # Start all services
   pnpm dev
   
  # Or start only the API
  pnpm dev:api
   ```

2. **Environment variables are set** (optional):
   ```bash
   # .env.test file
   MAIN_API_URL=http://localhost:3001
   TEST_EMAIL_DOMAIN=test.local
   CLEANUP_AFTER_TESTS=true
   VERBOSE=false
   ```

3. **Database is accessible** (for integration tests):
   - Cosmos DB or emulator running
   - Redis cache accessible

## Running Tests

### Run all authentication tests
```bash
cd /home/neodyme/Documents/Castiel/castiel
pnpm test tests/auth-email-password.test.ts
```

### Run API test suites
```bash
# Run all API tests
pnpm test tests/*-api.test.ts

# Run specific API test suite
pnpm test tests/auth-api.test.ts
pnpm test tests/project-api.test.ts
pnpm test tests/ai-insights-api.test.ts
pnpm test tests/integration-api.test.ts
```

### Run with coverage
```bash
pnpm test:coverage tests/auth-email-password.test.ts
```

### Run in watch mode (for development)
```bash
pnpm test:watch tests/auth-email-password.test.ts
```

### Run specific test suites
```bash
# Run only registration tests
pnpm test tests/auth-email-password.test.ts -t "User Registration"

# Run only login tests
pnpm test tests/auth-email-password.test.ts -t "User Login"

# Run only tenant isolation tests
pnpm test tests/auth-email-password.test.ts -t "Multi-Tenant Isolation"
```

### Run with verbose output
```bash
VERBOSE=true pnpm test tests/auth-email-password.test.ts
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAIN_API_URL` | `http://localhost:3001` | Main API service URL |
| `TEST_EMAIL_DOMAIN` | `test.local` | Domain for test emails |
| `CLEANUP_AFTER_TESTS` | `true` | Clean up test data after tests |
| `VERBOSE` | `false` | Enable verbose logging |
| `LOG_LEVEL` | `info` | Log level for tests |
| `EMAIL_VERIFICATION_REQUIRED` | `false` | Email verification required |
| `MFA_ENABLED` | `false` | MFA functionality enabled |
| `RATE_LIMITING_ENABLED` | `true` | Rate limiting enabled |
| `TEST_CONCURRENCY` | `4` (1 in CI) | Number of concurrent tests |

## Test Data

### Test Users
- All test users are created with emails in the format: `test-{timestamp}-{random}@test.local`
- Default password: `TestPassword123!`
- Test users are automatically cleaned up after tests

### Test Tenants
- Tests create isolated tenants with unique IDs
- Format: `tenant-{context}-{timestamp}`
- Tenants are automatically cleaned up after tests

## Test Helpers

### TestHelpers Class
Provides utility functions for:
- Service health checks
- User creation and management
- Login/logout operations
- Token refresh and revocation
- Cleanup operations

Example usage:
```typescript
const helpers = new TestHelpers(client);

// Wait for service
await helpers.waitForService('http://localhost:3001');

// Create test user
const user = await helpers.createTestUser('my-tenant');

// Login user
const tokens = await helpers.loginUser(user.email, user.password, user.tenantId);

// Cleanup
await helpers.cleanup();
```

### TestData Class
Provides test data generators:
- Email generation
- Password generation
- User data fixtures
- Malicious input examples
- Special characters and encodings

Example usage:
```typescript
// Generate random email
const email = TestData.generateEmail();

// Generate valid user
const user = TestData.generateValidUser('tenant-1');

// Get weak passwords for testing
const weakPasswords = TestData.getWeakPasswords();

// Get malicious inputs
const xssAttempts = TestData.getXSSAttempts();
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Idempotency**: Tests should be idempotent and can be run multiple times
4. **Descriptive Names**: Use descriptive test names that explain what is being tested
5. **Assertions**: Use specific assertions with meaningful error messages
6. **Timeouts**: Set appropriate timeouts for async operations
7. **Error Handling**: Handle errors gracefully and provide helpful failure messages

## Troubleshooting

### Tests are failing with connection errors
- Ensure main-api service is running on the correct port
- Check `MAIN_API_URL` environment variable
- Verify firewall/network settings

### Tests are timing out
- Increase timeout in test configuration
- Check service logs for performance issues
- Verify database and Redis connectivity

### Rate limiting is blocking tests
- Adjust rate limiting configuration in main-api
- Increase delays between requests in tests
- Run tests sequentially instead of in parallel

### Test data is not being cleaned up
- Check `CLEANUP_AFTER_TESTS` environment variable
- Verify database permissions for deletion
- Check cleanup logic in `TestHelpers.cleanup()`

### Email verification is required but tests skip it
- Set `EMAIL_VERIFICATION_REQUIRED=true` in environment
- Configure email service in main-api
- Or disable email verification for testing

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Authentication Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Start services
        run: pnpm dev &
        
      - name: Wait for services
        run: sleep 10
      
      - name: Run authentication tests
        run: pnpm test tests/auth-email-password.test.ts
        env:
          MAIN_API_URL: http://localhost:3001
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Files

### API Tests
- `auth-api.test.ts` - Authentication endpoints (registration, login, tokens, profile)
- `project-api.test.ts` - Project (shard) management endpoints
- `ai-insights-api.test.ts` - AI insight generation and management
- `integration-api.test.ts` - Integration catalog and management

### Integration Tests
- `integration/auth-full-flow.test.ts` - Complete authentication flows

### Security Tests
- `auth-csrf-protection.test.ts` - CSRF protection
- `auth-mfa-flow.test.ts` - Multi-factor authentication
- `security-headers.test.ts` - Security headers validation
- `security/auth-security.test.ts` - Security testing

### Other Tests
- `token-revocation.test.ts` - Token revocation
- `token-blacklist.test.ts` - Token blacklisting
- `tenant-switching.test.ts` - Tenant switching
- `logout-all-sessions.test.ts` - Session management
- `logout-pending-requests.test.ts` - Logout handling
- `audit-logout.test.ts` - Audit logging
- `websocket-integration.test.ts` - WebSocket functionality
- `ai-connection-env-var.test.ts` - AI connection configuration

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add tests to appropriate describe blocks
3. Use TestHelpers and TestData utilities
4. Add proper cleanup logic
5. Document any new environment variables
6. Update this README with new test coverage
7. Ensure tests are isolated and can run independently

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Main API Reference](../services/main-api/README.md)
- [Testing Best Practices](../docs/testing-best-practices.md)
- [Security Testing Guide](../docs/security-testing.md)

## License

Copyright © 2024 Castiel Team. All rights reserved.
