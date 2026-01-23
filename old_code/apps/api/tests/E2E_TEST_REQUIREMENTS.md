# E2E Test Requirements

**Last Updated:** 2025-01-XX  
**Purpose:** Document all requirements for running End-to-End (E2E) tests

---

## Overview

E2E tests require real services to be running and configured. This document outlines all requirements, setup instructions, and how to handle missing services.

---

## Required Services

### 1. Azure Cosmos DB

**Purpose:** Database for storing shards, shard types, and embedding jobs

**Required Environment Variables:**
- `COSMOS_DB_ENDPOINT` - Cosmos DB account endpoint (e.g., `https://your-account.documents.azure.com:443/`)
- `COSMOS_DB_KEY` - Cosmos DB account key (primary or secondary)
- `COSMOS_DB_DATABASE_ID` - Database name (default: `castiel`)
- `COSMOS_DB_SHARDS_CONTAINER` - Shards container name (default: `shards`)
- `COSMOS_DB_SHARD_TYPES_CONTAINER` - Shard types container name (default: `shard-types`)

**Setup:**
1. Create an Azure Cosmos DB account
2. Create a database (or use existing)
3. Create containers with partition key `/tenantId`:
   - `shards` container
   - `shard-types` container
   - `embedding-jobs` container (for embedding jobs E2E test)

**Local Development:**
- Use Azure Cosmos DB Emulator (Windows) or
- Use Azure Cosmos DB local development container

**Test Files Using This Service:**
- `tests/embedding/embedding-jobs.e2e.test.ts`
- `tests/embedding/change-feed-processor.verification.test.ts`
- `tests/embedding/embedding-pipeline.e2e.test.ts` (deprecated, skipped)

---

### 2. Redis

**Purpose:** Queue service (BullMQ) for embedding job processing

**Required Environment Variables:**
- `REDIS_URL` - Full Redis connection string (e.g., `redis://localhost:6379`)
- OR `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`) - optional if using REDIS_URL

**Setup:**
1. Install Redis locally or use cloud Redis service
2. Start Redis server
3. Configure connection string

**Local Development:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install locally
# macOS: brew install redis && brew services start redis
# Linux: sudo apt-get install redis-server && sudo systemctl start redis
```

**Test Files Using This Service:**
- `tests/embedding/embedding-jobs.e2e.test.ts`
- `tests/embedding/change-feed-processor.verification.test.ts`
- `tests/embedding/embedding-pipeline.e2e.test.ts` (deprecated, skipped)

---

### 3. Azure OpenAI

**Purpose:** Generate embeddings for shards

**Required Environment Variables:**
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (e.g., `https://your-resource.openai.azure.com/`)
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` - Embedding model deployment name (default: `text-embedding-ada-002`)

**Setup:**
1. Create an Azure OpenAI resource
2. Deploy an embedding model (e.g., `text-embedding-ada-002`)
3. Get the endpoint and API key from Azure portal

**Test Files Using This Service:**
- `tests/embedding/embedding-jobs.e2e.test.ts`
- `tests/embedding/change-feed-processor.verification.test.ts`
- `tests/embedding/embedding-pipeline.e2e.test.ts` (deprecated, skipped)

---

### 4. Azure Service Bus (Deprecated)

**Status:** ⚠️ **DEPRECATED** - No longer used, replaced by Redis/BullMQ

**Note:** Some deprecated tests may still reference this service, but it's not required for current E2E tests.

**Environment Variable (if needed for deprecated tests):**
- `AZURE_SERVICE_BUS_CONNECTION_STRING` - Service Bus connection string

**Test Files Using This Service:**
- `tests/embedding/embedding-pipeline.e2e.test.ts` (deprecated, skipped)

---

## Optional Configuration

### E2E Test Tenant ID

**Environment Variable:**
- `E2E_TENANT_ID` - Tenant ID to use for E2E tests (default: varies by test)

**Default Values:**
- `embedding-jobs.e2e.test.ts`: `tenant-e2e-jobs`
- `change-feed-processor.verification.test.ts`: `tenant-verification`
- `embedding-pipeline.e2e.test.ts`: `tenant-e2e` (deprecated)

---

## Test File Requirements

### `tests/embedding/embedding-jobs.e2e.test.ts`

**Required Services:**
- ✅ Cosmos DB
- ✅ Redis
- ✅ Azure OpenAI

**Containers Created:**
- `shards` (partition key: `/tenantId`)
- `shard-types` (partition key: `/tenantId`)
- `embedding-jobs` (partition key: `/tenantId`)

**What It Tests:**
- Embedding job creation and processing
- Queue service integration
- Change feed processing

---

### `tests/embedding/change-feed-processor.verification.test.ts`

**Required Services:**
- ✅ Cosmos DB
- ⚠️ Redis (optional - test will skip if unavailable)

**Containers Created:**
- `shards` (partition key: `/tenantId`)
- `shard-types` (partition key: `/tenantId`)

**What It Tests:**
- Change feed processor functionality
- Shard creation and processing
- Queue integration (if Redis available)

---

### `tests/embedding/embedding-pipeline.e2e.test.ts`

**Status:** ⚠️ **DEPRECATED** - Test is skipped

**Note:** This test uses deprecated Service Bus architecture. It has been skipped and should be updated to use QueueService (BullMQ) instead. See `embedding-jobs.e2e.test.ts` for the updated implementation.

---

## Setup Instructions

### Quick Start

1. **Set up environment variables:**
   ```bash
   # Copy example file
   cp apps/api/.env.example apps/api/.env.local
   
   # Edit and add required values
   # COSMOS_DB_ENDPOINT=...
   # COSMOS_DB_KEY=...
   # REDIS_URL=redis://localhost:6379
   # AZURE_OPENAI_ENDPOINT=...
   # AZURE_OPENAI_API_KEY=...
   ```

2. **Start required services:**
   ```bash
   # Start Redis (if using Docker)
   docker run -d -p 6379:6379 redis:latest
   
   # Or use Azure Cosmos DB Emulator (Windows)
   # Or configure cloud services
   ```

3. **Run E2E tests:**
   ```bash
   # Run all E2E tests
   pnpm --filter @castiel/api run test:e2e
   
   # Run specific test
   pnpm --filter @castiel/api run vitest run tests/embedding/embedding-jobs.e2e.test.ts
   ```

---

## Handling Missing Services

### Current Behavior

Currently, E2E tests **throw errors** if required services are missing:

```typescript
if (!cosmosEndpoint || !cosmosKey || !redisUrl) {
  throw new Error('E2E requires COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, and REDIS_URL or REDIS_HOST env vars')
}
```

### Current Implementation

E2E tests now **skip gracefully** when services are unavailable:

```typescript
// Check for required services - skip test if unavailable
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT
const cosmosKey = process.env.COSMOS_DB_KEY
const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST
const hasRequiredServices = !!(cosmosEndpoint && cosmosKey && redisUrl)

// Conditionally define test suite - prevents hooks from running when services unavailable
if (!hasRequiredServices) {
  console.warn('⚠️  Skipping E2E test: Missing required services...')
  describe.skip('Embedding Jobs E2E', () => {
    // Empty test suite when services are unavailable
  })
} else {
  describe('Embedding Jobs E2E', () => {
    // Test implementation with beforeAll guard
    beforeAll(async () => {
      // Defensive guard: Return early if services become unavailable
      if (!cosmosEndpoint || !cosmosKey || !redisUrl) {
        return
      }
      // ... test setup
    })
  })
}
```

**Benefits:**
- ✅ Tests don't fail in CI/CD when services aren't configured
- ✅ Clear indication that tests were skipped due to missing services
- ✅ Developers can run unit tests without setting up all services
- ✅ Test reports show skipped tests with clear reasons

**Note:** Vitest's `describe.skip()` still registers hooks, so a defensive guard in `beforeAll` is recommended to return early if services become unavailable.

---

## CI/CD Configuration

### Recommended Setup

1. **Use service containers** (GitHub Actions, GitLab CI):
   ```yaml
   services:
     redis:
       image: redis:latest
       ports:
         - 6379:6379
   ```

2. **Configure Azure services** via secrets:
   - `COSMOS_DB_ENDPOINT`
   - `COSMOS_DB_KEY`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`

3. **Skip E2E tests** if services unavailable:
   - Use conditional test execution
   - Document skipped tests in test reports

---

## Troubleshooting

### Common Issues

1. **"E2E requires COSMOS_DB_ENDPOINT..." error**
   - **Solution:** Set required environment variables in `.env.local`
   - **Alternative:** Skip E2E tests if services unavailable

2. **Redis connection failed**
   - **Solution:** Ensure Redis is running: `redis-cli ping`
   - **Check:** Verify `REDIS_URL` or `REDIS_HOST` is correct

3. **Cosmos DB authentication failed**
   - **Solution:** Verify `COSMOS_DB_KEY` is correct
   - **Check:** Ensure account endpoint matches

4. **Azure OpenAI rate limits**
   - **Solution:** Use test/deployment with higher rate limits
   - **Alternative:** Mock OpenAI service for local testing

---

## Best Practices

1. **Use separate test database** - Don't use production Cosmos DB
2. **Clean up test data** - Tests should clean up created resources
3. **Use test tenant IDs** - Isolate test data from other tenants
4. **Skip when unavailable** - Don't fail tests if services aren't configured
5. **Document dependencies** - Keep this document updated

---

## Future Improvements

1. **Add skip conditions** - Make tests skip gracefully when services unavailable
2. **Docker Compose setup** - Provide local development environment
3. **Mock services** - Allow running E2E tests with mocked services
4. **Test data management** - Automated test data setup and cleanup
5. **Service health checks** - Verify services are available before running tests

---

## Related Documentation

- [Test Suite README](./README-TEST-SUITE.md) - General test suite documentation
- [Test Coverage Assessment](../../TEST_COVERAGE_ASSESSMENT.md) - Test coverage status
- [Test Fixes Summary](../../TEST_FIXES_COMPREHENSIVE_SUMMARY.md) - Test fixes documentation

---

**Last Updated:** 2025-01-XX  
**Maintainer:** Development Team

