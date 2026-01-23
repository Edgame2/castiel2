# Phase 4: Testing Implementation Plan

**Status:** In Progress  
**Start Date:** December 5, 2025  
**Estimated Duration:** 15-17 days  
**Overall Project:** 70% → 85% complete after testing

---

## Overview

Phase 4 focuses on achieving 80%+ code coverage across the entire WebSocket-integrated Web Search feature. This phase is critical for ensuring reliability, performance, and user experience quality before moving to integration phases.

### Testing Scope

```
Total Estimated Tests: 150+
Total Lines of Test Code: 8,000+
Coverage Target: 80%+ across all layers
```

---

## Phase 4A: Service Layer Unit Tests (3-5 days)

### Objective
Test all service layer business logic with mocked external APIs. Focus on provider fallback, caching, and error scenarios.

### Services to Test

#### 1. WebSearchService
**File:** `apps/api/src/services/web-search.service.ts`

**Test Cases:**
- ✅ Execute search successfully (single provider)
- ✅ Provider fallback (primary fails → secondary)
- ✅ Provider health check tracking
- ✅ Cache hit for duplicate query
- ✅ Cache miss for new query
- ✅ Error handling (all providers fail)
- ✅ Request deduplication (parallel requests)
- ✅ Rate limiting per tenant
- ✅ Cost tracking and quota validation
- ✅ Search result ranking and filtering
- ✅ Domain whitelist/blacklist filtering
- ✅ Result deduplication by URL

**Lines of Test Code:** ~400-500

**Mock Setup:**
```typescript
// Mock SerpAPI and Bing providers
mockSerpAPI.search() → Success/Fail scenarios
mockBing.search() → Success/Fail scenarios
mockCosmosDB → Cache operations
mockMonitoring → Event tracking
```

#### 2. WebScraperService
**File:** `apps/api/src/services/web-scraper.service.ts`

**Test Cases:**
- ✅ Scrape valid HTML page
- ✅ Extract clean text from mixed content
- ✅ Handle malformed HTML gracefully
- ✅ Respect robots.txt
- ✅ Handle redirects (301, 302, 307, 308)
- ✅ Timeout handling (connection, read)
- ✅ Concurrent scraping (max 5 pages)
- ✅ Error recovery (retry with backoff)
- ✅ Progress event emission
- ✅ Content deduplication
- ✅ DOM tree structure preservation for chunking
- ✅ Memory limits (max 10MB per page)

**Lines of Test Code:** ~500-600

**Mock Setup:**
```typescript
// Mock HTTP client
mockAxios.get() → HTML responses
mockCheerio → DOM parsing
mockFileSystem → Robots.txt reading
```

#### 3. ContentChunkingService
**File:** `apps/api/src/services/content-chunking.service.ts`

**Test Cases:**
- ✅ Chunk respects token limits (512-token max)
- ✅ Respect sentence boundaries
- ✅ Preserve semantic meaning
- ✅ Handle multiple languages
- ✅ Minimize token waste (<20% overage)
- ✅ Empty/whitespace handling
- ✅ Code block preservation
- ✅ List/table structure preservation
- ✅ Metadata generation (start_idx, end_idx, source_url)
- ✅ Performance (chunk 1MB in <500ms)

**Lines of Test Code:** ~300-400

**Mock Setup:**
```typescript
// Mock token counter
mockTokenizer.countTokens() → Token count
mockLangChain → Splitting utilities
```

#### 4. EmbeddingService
**File:** `apps/api/src/services/embedding.service.ts`

**Test Cases:**
- ✅ Generate single embedding
- ✅ Batch embedding (up to 100 texts)
- ✅ Dimension consistency (1536 for text-embedding-3-small)
- ✅ Cache embedding results
- ✅ Rate limiting to OpenAI
- ✅ Error handling (API timeout, invalid input)
- ✅ Cost tracking per tenant
- ✅ Embedding quality validation
- ✅ Retry with exponential backoff
- ✅ Concurrent requests pooling
- ✅ Fallback to mock embeddings if API fails
- ✅ Tensor normalization

**Lines of Test Code:** ~350-450

**Mock Setup:**
```typescript
// Mock OpenAI
mockOpenAI.embeddings.create() → Embedding vectors
mockCache → Redis caching
mockMonitoring → Cost tracking
```

#### 5. SearchProviderFactory
**File:** `apps/api/src/services/search-providers/provider.factory.ts`

**Test Cases:**
- ✅ Create SerpAPI provider
- ✅ Create Bing provider
- ✅ Provider selection by priority
- ✅ Health check integration
- ✅ Fallback chain ordering
- ✅ Provider rotation for load balancing
- ✅ Tenant-specific provider override
- ✅ Error when no providers available
- ✅ Provider credential validation
- ✅ Timeout configuration per provider

**Lines of Test Code:** ~200-300

**Mock Setup:**
```typescript
// Mock provider instances
mockSerpAPI → Full mock
mockBing → Full mock
mockHealthCheck → Status responses
```

#### 6. Provider Fallback Logic
**File:** `apps/api/src/services/search-providers/fallback.service.ts`

**Test Cases:**
- ✅ Sequential fallback on error
- ✅ Exponential backoff (100ms, 200ms, 400ms)
- ✅ Circuit breaker pattern
- ✅ Max retries enforcement
- ✅ Partial success aggregation
- ✅ Latency-based routing
- ✅ Provider health recovery
- ✅ Load balancing across healthy providers
- ✅ Cost-aware provider selection
- ✅ Metrics collection (success rate, latency)

**Lines of Test Code:** ~300-400

**Mock Setup:**
```typescript
// Mock provider failure scenarios
mockProvider.search() → Fail, then succeed
mockTimer → Backoff simulation
mockMetrics → Event collection
```

### Test File Structure

```typescript
// apps/api/src/services/__tests__/unit/

web-search.service.test.ts         (~500 lines)
web-scraper.service.test.ts        (~600 lines)
content-chunking.service.test.ts   (~400 lines)
embedding.service.test.ts          (~450 lines)
provider.factory.test.ts           (~300 lines)
fallback.service.test.ts           (~400 lines)

// Total: ~2,650 lines of unit tests
```

### Coverage Targets

| Service | Target | Notes |
|---------|--------|-------|
| WebSearchService | 85% | High complexity with fallback logic |
| WebScraperService | 90% | Comprehensive error scenarios needed |
| ContentChunkingService | 95% | Well-scoped functionality |
| EmbeddingService | 85% | External API integration points |
| SearchProviderFactory | 90% | Clear paths for each provider |
| Fallback Service | 90% | Critical path for reliability |

---

## Phase 4B: API Integration Tests (2-3 days)

### Objective
Test REST endpoints and WebSocket with realistic request/response flows.

### Endpoints to Test (12 total)

#### 1. Search Operations
- `POST /api/v1/insights/search` - Execute search
- `GET /api/v1/insights/search/{shardId}` - Get cached result
- `POST /api/v1/insights/deep-search` - Start deep search (async)
- `GET /api/v1/insights/deep-search/{searchId}` - Get progress

**Test Cases per Endpoint:**
- ✅ Valid request → Success (200)
- ✅ Invalid query → Bad request (400)
- ✅ Missing auth → Unauthorized (401)
- ✅ Insufficient quota → Forbidden (403)
- ✅ Provider timeout → 504 Gateway Timeout
- ✅ Request validation
- ✅ Response schema validation
- ✅ Rate limiting (10 req/min per tenant)
- ✅ Pagination (if applicable)

#### 2. Search History
- `GET /api/v1/insights/search/history` - List searches
- `DELETE /api/v1/insights/search/{shardId}` - Delete search

**Test Cases:**
- ✅ List searches with pagination
- ✅ Filter by date range
- ✅ Search result ordering
- ✅ Delete single search
- ✅ ACL enforcement

#### 3. Recurring Searches
- `POST /api/v1/insights/recurring-search` - Create
- `GET /api/v1/insights/recurring-search` - List
- `PUT /api/v1/insights/recurring-search/{id}` - Update
- `DELETE /api/v1/insights/recurring-search/{id}` - Delete

**Test Cases:**
- ✅ CRUD operations
- ✅ Schedule validation
- ✅ Quota limits enforcement
- ✅ Execution history

#### 4. Search Statistics
- `GET /api/v1/insights/search/stats` - Get metrics
- `GET /api/v1/admin/web-search/usage` - Usage by tenant

**Test Cases:**
- ✅ Metric aggregation
- ✅ Date range filtering
- ✅ Cost breakdown accuracy
- ✅ Provider usage distribution

#### 5. Admin Endpoints
- `GET /api/v1/admin/web-search/providers` - List providers
- `GET /api/v1/admin/web-search/fallback-chain` - Get chain
- `PUT /api/v1/admin/web-search/fallback-chain` - Update chain
- `GET /api/v1/admin/web-search/health` - Provider health

**Test Cases:**
- ✅ Super admin access only
- ✅ Provider configuration CRUD
- ✅ Health check aggregation
- ✅ Configuration validation

#### 6. WebSocket
- `WS /api/v1/search/deep/ws` - Progress streaming

**Test Cases:**
- ✅ Connection established
- ✅ Progress events streamed
- ✅ Completion event
- ✅ Error event handling
- ✅ Reconnection on network error
- ✅ Proper cleanup on close
- ✅ Max 10 concurrent connections per user
- ✅ 60-second idle timeout

**Lines of Test Code:** ~2,000-2,500

### Test File Structure

```typescript
// apps/api/src/controllers/__tests__/integration/

search.integration.test.ts          (~600 lines)
recurring-search.integration.test.ts (~400 lines)
admin-search.integration.test.ts    (~400 lines)
websocket.integration.test.ts       (~600 lines)

// Total: ~2,000 lines of integration tests
```

---

## Phase 4C: Component/UI Tests (2-3 days)

### Objective
Test all 8 React components with both standalone and widget modes.

### Components to Test

#### 1. SearchInput Component
**File:** `apps/web/src/components/ai-insights/web-search/search-input.tsx`

**Test Cases:**
- ✅ Render with default props
- ✅ Handle search submission
- ✅ Domain filter input
- ✅ Advanced options toggle
- ✅ Input validation feedback
- ✅ Keyboard navigation
- ✅ Widget mode (smaller layout)
- ✅ Accessibility (ARIA labels)

**Lines:** ~150-200

#### 2. SearchResults Component
**File:** `apps/web/src/components/ai-insights/web-search/search-results.tsx`

**Test Cases:**
- ✅ Display search results
- ✅ Pagination controls
- ✅ Sorting options
- ✅ Result filtering
- ✅ Source citation display
- ✅ Result previews
- ✅ Loading state
- ✅ Error state with retry
- ✅ Empty results state
- ✅ Widget mode rendering

**Lines:** ~250-300

#### 3. DeepSearchToggle Component
**File:** `apps/web/src/components/ai-insights/web-search/deep-search-toggle.tsx`

**Test Cases:**
- ✅ Toggle state change
- ✅ Page depth configuration
- ✅ Cost display
- ✅ Info tooltip
- ✅ Disabled when quota exceeded
- ✅ Widget mode

**Lines:** ~100-150

#### 4. ScrapingProgress Component
**File:** `apps/web/src/components/ai-insights/web-search/scraping-progress.tsx`

**Test Cases:**
- ✅ Display progress bar
- ✅ Status color mapping
- ✅ Event list rendering
- ✅ Real-time updates (simulate WebSocket)
- ✅ Cancel button
- ✅ Completion badge
- ✅ Error display
- ✅ Widget mode

**Lines:** ~200-250

#### 5. RecurringSearchForm Component
**File:** `apps/web/src/components/ai-insights/web-search/recurring-search-form.tsx`

**Test Cases:**
- ✅ Form rendering
- ✅ Schedule input
- ✅ Deep search toggle in form
- ✅ Validation messages
- ✅ Submit handling
- ✅ Edit mode
- ✅ Delete confirmation
- ✅ Widget mode

**Lines:** ~200-250

#### 6. SearchStatistics Component
**File:** `apps/web/src/components/ai-insights/web-search/search-statistics.tsx`

**Test Cases:**
- ✅ Display statistics cards
- ✅ Chart rendering
- ✅ Date range filtering
- ✅ Metric aggregation
- ✅ Export functionality
- ✅ Empty state
- ✅ Loading skeleton
- ✅ Widget mode

**Lines:** ~200-250

#### 7. WebPagePreview Component
**File:** `apps/web/src/components/ai-insights/web-search/web-page-preview.tsx`

**Test Cases:**
- ✅ Display page content
- ✅ Chunk visualization
- ✅ Embedding visualization
- ✅ Source URL display
- ✅ Page metadata
- ✅ Copy to clipboard
- ✅ Modal mode
- ✅ Loading state

**Lines:** ~200-250

#### 8. WebSearchWidget Component
**File:** `apps/web/src/components/ai-insights/web-search/web-search-widget.tsx`

**Test Cases:**
- ✅ Widget layout
- ✅ Size responsive (small, medium, large)
- ✅ All child components integrate
- ✅ Widget configuration
- ✅ Refresh capability
- ✅ Export buttons
- ✅ Collapsed/expanded states

**Lines:** ~200-250

### Hook Tests

#### useDeepSearchWithSocket Hook
**File:** `apps/web/src/hooks/__tests__/use-web-search.test.ts`

**Test Cases:**
- ✅ Initialize socket connection
- ✅ Collect progress events
- ✅ Handle completion
- ✅ Handle error
- ✅ Reconnect on failure
- ✅ Cancel search
- ✅ Cleanup on unmount
- ✅ Cache invalidation

**Lines:** ~300-350

### Test File Structure

```typescript
// apps/web/src/components/ai-insights/web-search/__tests__/

search-input.test.tsx               (~200 lines)
search-results.test.tsx             (~300 lines)
deep-search-toggle.test.tsx         (~150 lines)
scraping-progress.test.tsx          (~250 lines)
recurring-search-form.test.tsx      (~250 lines)
search-statistics.test.tsx          (~250 lines)
web-page-preview.test.tsx           (~250 lines)
web-search-widget.test.tsx          (~250 lines)

// apps/web/src/hooks/__tests__/
use-web-search.test.ts              (~350 lines)

// Total: ~2,200 lines of component tests
```

---

## Phase 4D: E2E Tests (2-3 days)

### Objective
Test complete workflows with real API backend and database.

### Test Scenarios

#### Scenario 1: Basic Web Search
1. User enters query "latest Azure features"
2. Execute search
3. Verify results displayed (≥5 results)
4. Verify sources cited
5. Verify cost tracked

**Test Time:** ~5 seconds

#### Scenario 2: Deep Search with Progress
1. User enters query + enables deep search (3 pages)
2. HTTP search completes
3. WebSocket opens
4. Progress events stream (0%, 25%, 50%, 75%, 100%)
5. Verify progress UI updates in real-time
6. Deep search completes
7. Verify 3 pages scraped and chunked

**Test Time:** ~10 seconds

#### Scenario 3: Provider Fallback
1. Simulate SerpAPI failure
2. Execute search
3. Fallback to Bing automatically
4. Results returned from Bing
5. Verify no user-visible error

**Test Time:** ~8 seconds

#### Scenario 4: Recurring Search Execution
1. Create recurring search (daily)
2. Manually trigger execution
3. Verify results stored
4. Check execution history
5. Verify next run scheduled

**Test Time:** ~5 seconds

#### Scenario 5: WebSocket Reconnection
1. Start deep search
2. Simulate network failure (drop WebSocket)
3. Verify automatic reconnection
4. Progress continues
5. Completion succeeds

**Test Time:** ~8 seconds

#### Scenario 6: Error Handling
1. Enter invalid query (too short)
2. Verify validation error
3. Enter valid query
4. Simulate backend error (500)
5. Verify error toast
6. Verify retry capability

**Test Time:** ~6 seconds

#### Scenario 7: Rate Limiting
1. Execute 15 searches in quick succession
2. Verify 11th request returns 429 Too Many Requests
3. Verify error message
4. Wait 1 minute
5. Verify next search succeeds

**Test Time:** ~65 seconds

#### Scenario 8: Quota Enforcement
1. Set tenant quota to 5 searches/day
2. Execute 5 searches
3. 6th search rejected (quota exceeded)
4. Verify error message with quota info
5. Verify admin can override

**Test Time:** ~10 seconds

**Total E2E Tests:** 8 scenarios  
**Lines of Test Code:** ~800-1,000

### Test File Structure

```typescript
// tests/e2e/web-search/

basic-search.e2e.test.ts            (~120 lines)
deep-search-progress.e2e.test.ts    (~150 lines)
provider-fallback.e2e.test.ts       (~120 lines)
recurring-search.e2e.test.ts        (~120 lines)
websocket-reconnection.e2e.test.ts  (~150 lines)
error-handling.e2e.test.ts          (~100 lines)
rate-limiting.e2e.test.ts           (~120 lines)
quota-enforcement.e2e.test.ts       (~120 lines)

// Total: ~1,000 lines of E2E tests
```

---

## Coverage Summary

| Layer | Target | Lines of Tests |
|-------|--------|----------------|
| Unit Tests (Services) | 80%+ | 2,650 |
| Integration Tests (API) | 80%+ | 2,000 |
| Component Tests | 80%+ | 2,200 |
| E2E Tests | 8 scenarios | 1,000 |
| **Total** | **80%+** | **7,850** |

---

## Testing Tools & Frameworks

### Backend Testing
- **Framework:** Vitest
- **Assertion:** Chai
- **Mocking:** Sinon, Mock-fs, Nock
- **Coverage:** c8

### Frontend Testing
- **Framework:** Vitest + React Testing Library
- **Assertion:** Chai
- **Component Mock:** @testing-library/react
- **Coverage:** c8

### E2E Testing
- **Framework:** Playwright
- **API Testing:** Axios + custom helpers
- **WebSocket:** ws library
- **Database:** Real Cosmos DB test instance

---

## Test Execution Schedule

### Week 1: Unit Tests (Mon-Wed)
- **Monday:** WebSearchService + WebScraperService (500 lines)
- **Tuesday:** ContentChunkingService + EmbeddingService (450 lines)
- **Wednesday:** ProviderFactory + Fallback Service (400 lines)

### Week 1: Integration Tests (Thu-Fri)
- **Thursday:** Search endpoints + WebSocket (800 lines)
- **Friday:** Admin endpoints + History (600 lines)

### Week 2: Component Tests (Mon-Tue)
- **Monday:** Input, Results, Toggle components (500 lines)
- **Tuesday:** Progress, Form, Stats components (500 lines)
- **Wednesday:** Preview, Widget, Hook tests (700 lines)

### Week 2: E2E Tests (Thu-Fri)
- **Thursday:** Basic search, Deep search, Fallback (400 lines)
- **Friday:** Recurring, WebSocket, Error, Quota (600 lines)

---

## Success Criteria

### Phase 4 Complete When:
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All component tests pass
- ✅ All E2E scenarios pass
- ✅ Code coverage ≥ 80% for all layers
- ✅ No critical or high-severity bugs
- ✅ Performance: Tests complete in < 10 minutes total
- ✅ Documentation: Test patterns documented

---

## Next Phase (Phase 5)

After Phase 4 completion:

### Phase 5A: Context Assembly Integration (2-3 days)
- Auto-trigger web search based on user intent
- Connect to ContextAssemblerService
- Implement vector similarity search

### Phase 5B: Grounding Service Integration (2-3 days)
- Generate citations from web search results
- Source attribution
- Fact verification

### Phase 6: Admin Dashboard (1-2 days)
- Provider management UI
- Usage analytics
- Quota management

---

## Notes

- All external APIs (SerpAPI, Bing, OpenAI) should be mocked for unit/integration tests
- Use real API instances for E2E tests only (in test environment)
- Keep test data small (< 1MB total) for fast execution
- Run tests in parallel where possible (Vitest supports this)
- Collect coverage reports for all layers
- Document any flaky tests and causes
- Use fixtures for common test data patterns

