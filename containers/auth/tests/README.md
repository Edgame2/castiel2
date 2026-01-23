# Authentication Module - Test Suite

## Overview

This directory contains the complete test suite for the Authentication module, covering unit tests, integration tests, and test fixtures.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup, mocks, and configuration
├── fixtures/                   # Test data and fixtures
│   └── users.ts               # User test data (valid/invalid users, tokens, passwords)
├── unit/                       # Unit tests for individual components
│   ├── utils/                 # Utility function tests
│   │   └── passwordUtils.test.ts
│   └── services/             # Service layer tests
│       ├── PasswordResetService.test.ts
│       ├── SessionService.test.ts
│       ├── EmailVerificationService.test.ts
│       └── AuthProviderService.test.ts
└── integration/               # Integration tests
    └── routes/               # API endpoint tests
        └── auth.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:int
```

### Specific Test File
```bash
npm test -- tests/unit/utils/passwordUtils.test.ts
```

## Test Coverage

### Unit Tests

#### Password Utilities (`tests/unit/utils/passwordUtils.test.ts`)
- ✅ Password hashing with bcrypt
- ✅ Password verification
- ✅ Password strength validation
- ✅ Common password detection
- ✅ Personal information detection
- ✅ HaveIBeenPwned integration

#### Password Reset Service (`tests/unit/services/PasswordResetService.test.ts`)
- ✅ Password reset token creation
- ✅ Token validation
- ✅ Token expiration handling
- ✅ Token reuse prevention
- ✅ User validation

#### Session Service (`tests/unit/services/SessionService.test.ts`)
- ✅ Session creation
- ✅ Device fingerprinting
- ✅ Remember me functionality
- ✅ JWT token generation

#### Email Verification Service (`tests/unit/services/EmailVerificationService.test.ts`)
- ✅ Verification token generation
- ✅ Token storage and retrieval
- ✅ Email verification flow
- ✅ Token expiration
- ✅ Token reuse prevention

#### Auth Provider Service (`tests/unit/services/AuthProviderService.test.ts`)
- ✅ Provider linking (Google, GitHub, etc.)
- ✅ Provider unlinking
- ✅ Last provider protection
- ✅ Provider listing

### Integration Tests

#### Authentication Routes (`tests/integration/routes/auth.test.ts`)
- ✅ User registration
- ✅ User login
- ✅ Registration validation
- ✅ Login error handling
- ✅ Health check endpoint

## Test Fixtures

### User Fixtures (`tests/fixtures/users.ts`)
- Valid user data
- Invalid user data
- OAuth user data
- Test tokens (valid, invalid, expired)
- Test passwords (valid, weak, common)

## Mocking Strategy

Tests use comprehensive mocking to isolate units under test:

- **Database**: Prisma client mocked with `vi.mock('@coder/shared')`
- **Redis**: Redis client mocked in `tests/setup.ts`
- **Event Publisher**: RabbitMQ events mocked
- **External Services**: Logging and Notification services mocked
- **JWT**: JWT signing mocked for session tests

## Test Environment

Tests run in a controlled environment with:

- Mocked environment variables
- Isolated database connections
- Mocked external dependencies
- Configurable timeouts (30 seconds)

## Coverage Thresholds

The test suite enforces the following coverage thresholds:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

## Writing New Tests

When adding new tests:

1. **Unit Tests**: Place in `tests/unit/` matching the source structure
2. **Integration Tests**: Place in `tests/integration/`
3. **Fixtures**: Add reusable test data to `tests/fixtures/`
4. **Mocks**: Add global mocks to `tests/setup.ts`

### Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Troubleshooting

### Tests Fail with "Cannot find package"
- Ensure dependencies are installed: `npm install`
- Check that workspace dependencies are properly linked

### Tests Timeout
- Increase timeout in `vitest.config.mjs` if needed
- Check for hanging async operations

### Mock Issues
- Clear mocks between tests using `vi.clearAllMocks()`
- Reset modules if needed: `vi.resetModules()`

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

- No external dependencies required (all mocked)
- Fast execution (< 30 seconds)
- Deterministic results
- Coverage reporting included


