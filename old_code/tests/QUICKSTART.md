# Quick Start Guide - Authentication Tests

This guide will help you quickly get started with running the authentication tests.

## Prerequisites

1. **Node.js 20+** and **pnpm** installed
2. **Services running** (main-api on port 3001)

## Quick Start (5 minutes)

### Step 1: Start Services
```bash
# From project root
cd /home/neodyme/Documents/Castiel/castiel
pnpm dev
```

Wait for services to start (you should see logs indicating services are ready).

### Step 2: Run Tests
```bash
# Run all authentication tests
./tests/run-auth-tests.sh

# Or use pnpm directly
pnpm test tests/auth-email-password.test.ts
```

That's it! The tests will run automatically.

## Common Commands

### Run specific test suites
```bash
# Only registration tests
./tests/run-auth-tests.sh -t "User Registration"

# Only login tests
./tests/run-auth-tests.sh -t "User Login"

# Only tenant isolation tests
./tests/run-auth-tests.sh -t "Multi-Tenant Isolation"
```

### Run with coverage
```bash
./tests/run-auth-tests.sh --coverage
```

### Run in watch mode (for development)
```bash
./tests/run-auth-tests.sh --watch
```

### Run with verbose output
```bash
./tests/run-auth-tests.sh --verbose
```

## Test Results

After running, you'll see:
- ✅ **Green checks** - Tests passed
- ❌ **Red X's** - Tests failed
- **Summary** - Total tests, passed, failed, duration

Example output:
```
✓ tests/auth-email-password.test.ts (156)
  ✓ User Registration (45)
  ✓ Email Verification (8)
  ✓ User Login (32)
  ✓ Token Management (28)
  ✓ Password Reset Flow (12)
  ✓ Multi-Tenant Isolation (15)
  ✓ Security and Edge Cases (16)

Test Files  1 passed (1)
     Tests  156 passed (156)
  Start at  10:30:45
  Duration  45.23s
```

## Troubleshooting

### "Service not running" error
- Make sure main-api is running: `pnpm dev:api`
- Check the service is accessible: `curl http://localhost:3001/health`

### "Connection refused" error
- Check if port 3001 is in use: `lsof -i :3001`
- Verify MAIN_API_URL in `.env.test`

### Tests are slow or timing out
- Increase timeout in `tests/config/test-config.ts`
- Check service logs for performance issues
- Run tests sequentially: set `TEST_CONCURRENCY=1`

### Rate limiting errors
- The tests include rate limiting checks
- Some failures are expected to test rate limiting
- Adjust `rateLimitMaxAttempts` in config if needed

## What's Being Tested?

The comprehensive test suite includes:

1. **User Registration** (45 tests)
   - Valid registration scenarios
   - Email format validation
   - Password strength requirements
   - Duplicate detection
   - Security (SQL injection, XSS)

2. **Email Verification** (8 tests)
   - Verification flow
   - Token validation
   - Expiration handling

3. **User Login** (32 tests)
   - Successful login
   - Invalid credentials
   - Tenant isolation
   - Rate limiting
   - Case sensitivity

4. **Token Management** (28 tests)
   - Access tokens
   - Refresh tokens
   - Token revocation
   - Introspection
   - Logout

5. **Password Reset** (12 tests)
   - Reset request
   - Token validation
   - Password update
   - Security considerations

6. **Multi-Tenant Isolation** (15 tests)
   - Data isolation
   - Cross-tenant prevention
   - Tenant-specific configs

7. **Security Tests** (16 tests)
   - Input sanitization
   - Injection prevention
   - Concurrent operations
   - Character encoding

8. **Password Complexity** (6 tests)
   - Length requirements
   - Character type requirements
   - Strong password validation

## Next Steps

- Review test results and logs
- Add more test cases as needed
- Integrate into CI/CD pipeline
- Check coverage report (if ran with --coverage)

For detailed documentation, see [tests/README.md](./README.md)
