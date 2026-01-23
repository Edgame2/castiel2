# Complete Test Suite with Auto-Fix

This directory contains a comprehensive test suite that automatically checks configuration, fixes common issues, and runs all tests.

## Quick Start

### 1. Setup Test Environment (First Time)

```bash
pnpm --filter @castiel/api run test:setup
```

This will:
- Check Node and pnpm versions
- Install dependencies if needed
- Run configuration checker
- Run auto-fixer
- Verify test setup

### 2. Check Configuration

```bash
pnpm --filter @castiel/api run test:check-config
```

This validates:
- Environment variables
- Test data files
- Mock configurations
- Service configurations

### 3. Auto-Fix Issues

```bash
pnpm --filter @castiel/api run test:fix
```

This automatically fixes:
- Missing mock configurations
- Syntax errors in test files
- Missing imports
- Other common issues

### 4. Run Complete Test Suite

```bash
pnpm --filter @castiel/api run test:complete
```

This runs:
1. Environment setup
2. Configuration check
3. Auto-fixes
4. Master test suite (configuration validation)
5. Unit tests
6. Integration tests
7. E2E tests (if services configured)
8. Coverage report

## Test Scripts

### Available Commands

| Command | Description |
|---------|-------------|
| `test:setup` | Setup test environment (first time) |
| `test:check-config` | Check test configuration |
| `test:fix` | Auto-fix common test issues |
| `test:complete` | Run complete test suite |
| `test:all` | Run all tests |
| `test:unit` | Run unit tests only |
| `test:integration` | Run integration tests only |
| `test:e2e` | Run E2E tests only |
| `test:suite` | Run master test suite |
| `test:watch` | Run tests in watch mode |
| `test:coverage` | Generate coverage report |

## Test Structure

```
tests/
├── suite/
│   └── master-test-suite.ts    # Master orchestrator
├── utils/
│   ├── test-config-checker.ts  # Configuration checker
│   ├── test-auto-fixer.ts      # Auto-fixer
│   ├── test-utils.ts           # Test utilities
│   └── fixtures.ts             # Test fixtures
├── unit/                        # Unit tests
├── integration/                 # Integration tests
└── embedding/                   # E2E tests
```

## Configuration

### Environment Variables

For unit tests, most environment variables have defaults. For integration/E2E tests, you may need to configure:

1. **Copy example config:**
   ```bash
   cp apps/api/.env.example apps/api/.env.local
   ```

2. **Fill in your values** (for integration/E2E tests):
   - `COSMOS_DB_ENDPOINT` - CosmosDB endpoint
   - `COSMOS_DB_KEY` - CosmosDB key
   - `REDIS_URL` or `REDIS_HOST` - Redis connection
   - `AZURE_OPENAI_ENDPOINT` - OpenAI endpoint
   - `AZURE_OPENAI_API_KEY` - OpenAI API key

**📖 For detailed E2E test requirements, see [E2E_TEST_REQUIREMENTS.md](./E2E_TEST_REQUIREMENTS.md)**

### Test Data Files

The test suite automatically creates missing test data files:
- `data/prompts/system-prompts.json` - System prompts for AI tests

## Auto-Fix Features

The auto-fixer automatically fixes:

1. **Mock Configurations**
   - Adds missing JWT mocks in authorization tests
   - Adds missing `reply.header` mocks in rate limiting tests
   - Adds missing `NotificationChannel` imports

2. **Syntax Errors**
   - Removes duplicate variable declarations
   - Fixes common syntax issues

3. **Missing Imports**
   - Adds missing `vi` import from vitest
   - Adds other common missing imports

## What Gets Tested

### Infrastructure Tests
- ✅ Environment variables
- ✅ Test data files
- ✅ Test utilities
- ✅ Configuration validation

### Unit Tests
- ✅ Service logic
- ✅ Utility functions
- ✅ Controllers
- ✅ Business logic

### Integration Tests
- ✅ API endpoints
- ✅ Database operations
- ✅ External service integrations
- ✅ Authentication/Authorization

### E2E Tests
- ✅ Complete workflows
- ✅ Embedding pipeline
- ✅ Change feed processing
- ✅ Service Bus integration

## Troubleshooting

### Tests Fail with "Missing Environment Variable"

Run the configuration checker:
```bash
pnpm --filter @castiel/api run test:check-config
```

This will automatically set defaults for test environment variables.

### Tests Fail with "Missing File"

Run the auto-fixer:
```bash
pnpm --filter @castiel/api run test:fix
```

This will create missing test data files.

### Integration Tests Fail

Integration tests require running services. Either:
1. Configure real service connections in `.env.test`
2. Skip integration tests: `pnpm test:unit` instead of `pnpm test:complete`

### Mock Configuration Issues

The auto-fixer should handle most mock issues. If problems persist:
1. Check the test file for proper mock setup
2. Review `tests/utils/test-utils.ts` for mock utilities
3. Check test file imports

## Best Practices

1. **Run setup first**: Always run `test:setup` when setting up a new environment
2. **Check config before tests**: Run `test:check-config` to validate setup
3. **Fix issues automatically**: Run `test:fix` to auto-fix common issues
4. **Run complete suite**: Use `test:complete` for full validation
5. **Review coverage**: Check coverage reports after running tests

## Continuous Integration

For CI/CD pipelines:

```bash
# Setup
pnpm install
pnpm --filter @castiel/api run test:setup

# Run tests
pnpm --filter @castiel/api run test:complete

# Or run specific categories
pnpm --filter @castiel/api run test:unit
pnpm --filter @castiel/api run test:integration
```

## Support

If you encounter issues:
1. Check the configuration: `pnpm test:check-config`
2. Run auto-fixer: `pnpm test:fix`
3. Review test output for specific errors
4. Check `TEST_RESULTS.md` for known issues



