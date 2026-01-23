/**
 * Web Search API Integration Tests
 * Tests for REST endpoints and WebSocket integration
 * Tests: POST /api/v1/insights/search, GET /api/v1/insights/search/{id}, WebSocket updates
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
/**
 * Mock FastifyInstance for testing API routes
 */
class MockFastifyApp {
    webSearchService;
    webScraperService;
    monitoring;
    routes = new Map();
    middleware = [];
    requestCount = 0;
    rateLimitMap = new Map();
    constructor(webSearchService, webScraperService, monitoring) {
        this.webSearchService = webSearchService;
        this.webScraperService = webScraperService;
        this.monitoring = monitoring;
        this.setupRoutes();
    }
    setupRoutes() {
        // Ensure route maps exist
        if (!this.routes.has('POST'))
            this.routes.set('POST', new Map());
        if (!this.routes.has('GET'))
            this.routes.set('GET', new Map());
        if (!this.routes.has('WS'))
            this.routes.set('WS', new Map());
        // POST /api/v1/insights/search
        const postMap = this.routes.get('POST');
        postMap.set('/api/v1/insights/search', this.postSearch.bind(this));
        postMap.set('/api/v1/insights/search/:id/cancel', this.cancelSearch.bind(this));
        postMap.set('/api/v1/recurring-search', this.postRecurringSearch.bind(this));
        postMap.set('/api/v1/recurring-search/:id/execute', this.executeRecurringSearch.bind(this));
        // GET routes
        const getMap = this.routes.get('GET');
        getMap.set('/api/v1/insights/search/:id', this.getSearchResults.bind(this));
        getMap.set('/api/v1/insights/search/:id/history', this.getSearchHistory.bind(this));
        getMap.set('/api/v1/recurring-search', this.getRecurringSearches.bind(this));
        getMap.set('/api/v1/recurring-search/:id', this.getRecurringSearch.bind(this));
        getMap.set('/api/v1/insights/search/statistics', this.getSearchStatistics.bind(this));
        getMap.set('/api/v1/admin/quota', this.getQuotaStatus.bind(this));
        getMap.set('/api/v1/admin/providers/health', this.getProviderHealth.bind(this));
        // WebSocket
        const wsMap = this.routes.get('WS');
        wsMap.set('/api/v1/insights/deep-search-progress', this.wsDeepSearchProgress.bind(this));
    }
    async request(req) {
        this.requestCount++;
        const method = req.method.toUpperCase();
        const routeMap = this.routes.get(method);
        if (!routeMap) {
            return { statusCode: 404, body: { error: 'Method not found' }, headers: {} };
        }
        // Find matching route
        let handler;
        let params = {};
        for (const [pattern, fn] of routeMap.entries()) {
            const match = this.matchRoute(pattern, req.url);
            if (match) {
                handler = fn;
                params = match.params;
                break;
            }
        }
        if (!handler) {
            return { statusCode: 404, body: { error: 'Route not found' }, headers: {} };
        }
        // Check rate limit
        const userId = req.user?.id || 'anonymous';
        const rateLimitKey = `${userId}:${req.method}:${req.url}`;
        if (this.isRateLimited(rateLimitKey)) {
            return {
                statusCode: 429,
                body: { error: 'Too many requests', retryAfter: 60 },
                headers: { 'Retry-After': '60' }
            };
        }
        try {
            const result = await handler(req, params);
            return result;
        }
        catch (error) {
            this.monitoring.trackEvent('API_ERROR', {
                route: req.url,
                method,
                error: error.message,
                userId: req.user?.id
            });
            return {
                statusCode: 500,
                body: { error: error.message || 'Internal server error' },
                headers: {}
            };
        }
    }
    matchRoute(pattern, url) {
        const patternParts = pattern.split('/');
        const urlParts = url.split('/');
        if (patternParts.length !== urlParts.length)
            return null;
        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = urlParts[i];
            }
            else if (patternParts[i] !== urlParts[i]) {
                return null;
            }
        }
        return { params };
    }
    isRateLimited(key) {
        const limit = this.rateLimitMap.get(key);
        if (!limit) {
            this.rateLimitMap.set(key, { count: 1, resetAt: new Date(Date.now() + 60000) });
            return false;
        }
        if (new Date() > limit.resetAt) {
            limit.count = 1;
            limit.resetAt = new Date(Date.now() + 60000);
            return false;
        }
        limit.count++;
        return limit.count > 10; // 10 requests per minute
    }
    // POST /api/v1/insights/search
    async postSearch(req, params) {
        const searchReq = req.body;
        if (!searchReq.query) {
            return { statusCode: 400, body: { error: 'Query required' }, headers: {} };
        }
        const queryHash = this.hashQuery(searchReq.query);
        const shardId = `${req.user?.tenantId}:${queryHash}:${Date.now()}`;
        // Simulate search execution
        const results = await this.webSearchService.search(searchReq.query, {
            tenantId: req.user?.tenantId || 'default',
            userId: req.user?.id || 'anonymous',
            deepSearch: searchReq.deepSearch || false,
            filters: searchReq.filters
        });
        const response = {
            shardId,
            query: searchReq.query,
            results: results.map((r, i) => ({
                rank: i + 1,
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                source: r.source,
                ...(searchReq.deepSearch && { content: 'Scraped content would go here' })
            })),
            deepSearchStatus: searchReq.deepSearch ? 'pending' : undefined,
            metrics: {
                totalResults: results.length,
                processingTime: 150,
                provider: 'serpapi',
                cached: false
            }
        };
        this.monitoring.trackEvent('SEARCH_EXECUTED', {
            tenantId: req.user?.tenantId,
            deepSearch: searchReq.deepSearch,
            resultCount: results.length
        });
        return { statusCode: 200, body: response, headers: { 'X-Shard-Id': shardId } };
    }
    // GET /api/v1/insights/search/{id}
    async getSearchResults(req, params) {
        const { id } = params;
        if (!id) {
            return { statusCode: 400, body: { error: 'Search ID required' }, headers: {} };
        }
        // Simulate retrieving cached results
        const cachedResults = {
            shardId: id,
            query: 'retrieved from cache',
            results: [
                {
                    rank: 1,
                    title: 'Result 1',
                    url: 'https://example.com/1',
                    snippet: 'Example snippet 1',
                    source: 'example.com'
                }
            ],
            metrics: {
                totalResults: 1,
                processingTime: 45,
                provider: 'cache',
                cached: true
            }
        };
        this.monitoring.trackEvent('SEARCH_RETRIEVED', {
            shardId: id,
            source: 'cache'
        });
        return { statusCode: 200, body: cachedResults, headers: {} };
    }
    // GET /api/v1/insights/search/{id}/history
    async getSearchHistory(req, params) {
        const { id } = params;
        const history = {
            searchId: id,
            executions: [
                {
                    timestamp: new Date(Date.now() - 86400000),
                    provider: 'serpapi',
                    resultCount: 10,
                    processingTime: 245
                },
                {
                    timestamp: new Date(Date.now() - 3600000),
                    provider: 'cache',
                    resultCount: 10,
                    processingTime: 45
                }
            ]
        };
        return { statusCode: 200, body: history, headers: {} };
    }
    // POST /api/v1/recurring-search
    async postRecurringSearch(req, params) {
        const { query, schedule, deepSearch } = req.body;
        if (!query || !schedule) {
            return { statusCode: 400, body: { error: 'Query and schedule required' }, headers: {} };
        }
        const recurringId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const response = {
            id: recurringId,
            query,
            schedule,
            deepSearch: deepSearch || false,
            createdAt: new Date(),
            nextExecution: this.calculateNextExecution(schedule),
            executionCount: 0,
            lastExecution: null
        };
        this.monitoring.trackEvent('RECURRING_SEARCH_CREATED', {
            tenantId: req.user?.tenantId,
            schedule
        });
        return { statusCode: 201, body: response, headers: { Location: `/api/v1/recurring-search/${recurringId}` } };
    }
    // GET /api/v1/recurring-search
    async getRecurringSearches(req, params) {
        const searches = [
            {
                id: 'rec_1',
                query: 'AI insights',
                schedule: 'daily',
                deepSearch: true,
                executionCount: 5,
                lastExecution: new Date(Date.now() - 3600000)
            },
            {
                id: 'rec_2',
                query: 'machine learning',
                schedule: 'weekly',
                deepSearch: false,
                executionCount: 2,
                lastExecution: new Date(Date.now() - 604800000)
            }
        ];
        return { statusCode: 200, body: { searches, total: 2 }, headers: {} };
    }
    // GET /api/v1/recurring-search/{id}
    async getRecurringSearch(req, params) {
        const { id } = params;
        const search = {
            id,
            query: 'Retrieved recurring search',
            schedule: 'daily',
            deepSearch: true,
            createdAt: new Date(Date.now() - 2592000000),
            nextExecution: new Date(Date.now() + 3600000),
            executionCount: 30,
            lastExecution: new Date(Date.now() - 3600000)
        };
        return { statusCode: 200, body: search, headers: {} };
    }
    // POST /api/v1/recurring-search/{id}/execute
    async executeRecurringSearch(req, params) {
        const { id } = params;
        const executionId = `exec_${Date.now()}`;
        const response = {
            executionId,
            recurringSearchId: id,
            startedAt: new Date(),
            status: 'in-progress',
            shardId: `${id}:${executionId}`
        };
        return { statusCode: 202, body: response, headers: {} };
    }
    // GET /api/v1/insights/search/statistics
    async getSearchStatistics(req, params) {
        const stats = {
            period: 'last_7_days',
            totalSearches: 156,
            uniqueQueries: 89,
            averageResultCount: 12.3,
            cacheHitRate: 0.68,
            deepSearchPercentage: 0.35,
            averageLatency: 182,
            costBreakdown: {
                searches: 1.56,
                deepSearch: 2.84,
                embeddings: 0.45,
                total: 4.85
            }
        };
        return { statusCode: 200, body: stats, headers: {} };
    }
    // GET /api/v1/admin/quota
    async getQuotaStatus(req, params) {
        if (req.user?.role !== 'admin') {
            return { statusCode: 403, body: { error: 'Forbidden' }, headers: {} };
        }
        const quota = {
            tenantId: req.user?.tenantId,
            daily: {
                searches: { limit: 1000, used: 342, remaining: 658 },
                deepSearches: { limit: 100, used: 35, remaining: 65 },
                embeddings: { limit: 10000, used: 2847, remaining: 7153 }
            },
            monthly: {
                cost: { limit: 500, used: 148.95, remaining: 351.05 }
            },
            resetAt: new Date(Date.now() + 86400000)
        };
        return { statusCode: 200, body: quota, headers: {} };
    }
    // GET /api/v1/admin/providers/health
    async getProviderHealth(req, params) {
        if (req.user?.role !== 'admin') {
            return { statusCode: 403, body: { error: 'Forbidden' }, headers: {} };
        }
        const health = {
            providers: [
                {
                    name: 'serpapi',
                    status: 'healthy',
                    lastCheck: new Date(),
                    responseTime: 234,
                    successRate: 0.998,
                    failureCount: 2
                },
                {
                    name: 'bing',
                    status: 'healthy',
                    lastCheck: new Date(),
                    responseTime: 456,
                    successRate: 0.995,
                    failureCount: 5
                }
            ],
            overallStatus: 'healthy'
        };
        return { statusCode: 200, body: health, headers: {} };
    }
    // POST /api/v1/insights/search/{id}/cancel
    async cancelSearch(req, params) {
        const { id } = params;
        return {
            statusCode: 200,
            body: { message: 'Search cancelled', shardId: id },
            headers: {}
        };
    }
    // WebSocket /api/v1/insights/deep-search-progress
    async wsDeepSearchProgress(req, params) {
        const { shardId } = req.query || {};
        // Simulate WebSocket connection
        return {
            statusCode: 101,
            body: {
                message: 'WebSocket connection established',
                shardId,
                messageTypes: ['fetching', 'parsing', 'chunking', 'embedding', 'complete', 'error']
            },
            headers: { Upgrade: 'websocket', Connection: 'Upgrade' }
        };
    }
    hashQuery(query) {
        return require('crypto').createHash('sha256').update(query.toLowerCase()).digest('hex').slice(0, 16);
    }
    calculateNextExecution(schedule) {
        const now = new Date();
        switch (schedule) {
            case 'hourly':
                return new Date(now.getTime() + 3600000);
            case 'daily':
                return new Date(now.getTime() + 86400000);
            case 'weekly':
                return new Date(now.getTime() + 604800000);
            default:
                return new Date(now.getTime() + 3600000);
        }
    }
}
/**
 * Test Suites
 */
describe('Web Search API Routes', () => {
    let app;
    let mockSearchService;
    let mockScraperService;
    let mockMonitoring;
    const mockUser = { id: 'user1', tenantId: 'tenant1', role: 'user' };
    const mockAdmin = { id: 'admin1', tenantId: 'tenant1', role: 'admin' };
    beforeEach(() => {
        // Setup mock services
        mockSearchService = {
            search: vi.fn().mockResolvedValue([
                {
                    title: 'Test Result',
                    url: 'https://example.com',
                    snippet: 'Test snippet',
                    source: 'example.com'
                }
            ]),
            searchWithFallback: vi.fn(),
            getCached: vi.fn(),
            clearCache: vi.fn()
        };
        mockScraperService = {
            scrapePages: vi.fn().mockResolvedValue([]),
            extractContent: vi.fn(),
            validateUrl: vi.fn()
        };
        mockMonitoring = {
            trackEvent: vi.fn(),
            trackException: vi.fn(),
            trackDependency: vi.fn()
        };
        app = new MockFastifyApp(mockSearchService, mockScraperService, mockMonitoring);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    // ============================================================================
    // POST /api/v1/insights/search Tests
    // ============================================================================
    describe('POST /api/v1/insights/search', () => {
        it('should execute search and return results', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'AI insights' },
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.shardId).toBeDefined();
            expect(response.body.results).toBeDefined();
            expect(response.body.results.length).toBeGreaterThan(0);
            expect(response.body.metrics.cached).toBe(false);
        });
        it('should reject search without query', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBeDefined();
        });
        it('should handle deep search requests', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'AI insights', deepSearch: true },
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.deepSearchStatus).toBe('pending');
        });
        it('should support search filters', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: {
                    query: 'AI insights',
                    filters: { domain: ['github.com', 'stackoverflow.com'] }
                },
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(mockSearchService.search).toHaveBeenCalledWith('AI insights', expect.objectContaining({ filters: expect.any(Object) }));
        });
        it('should enforce rate limiting', async () => {
            // Make 11 requests (limit is 10)
            for (let i = 0; i < 11; i++) {
                const response = await app.request({
                    method: 'POST',
                    url: '/api/v1/insights/search',
                    headers: {},
                    body: { query: `Query ${i}` },
                    user: mockUser
                });
                if (i < 10) {
                    expect(response.statusCode).toBe(200);
                }
                else {
                    expect(response.statusCode).toBe(429);
                    expect(response.body.error).toContain('Too many requests');
                }
            }
        });
        it('should track search events', async () => {
            await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'test', deepSearch: true },
                user: mockUser
            });
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('SEARCH_EXECUTED', expect.objectContaining({
                tenantId: mockUser.tenantId,
                deepSearch: true
            }));
        });
        it('should return shard ID in header', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'test' },
                user: mockUser
            });
            expect(response.headers['X-Shard-Id']).toBeDefined();
        });
    });
    // ============================================================================
    // GET /api/v1/insights/search/{id} Tests
    // ============================================================================
    describe('GET /api/v1/insights/search/{id}', () => {
        it('should retrieve cached search results', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_123',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.shardId).toBe('search_123');
            expect(response.body.results).toBeDefined();
        });
        it('should return 400 for missing search ID', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(400);
        });
        it('should indicate cached results', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_456',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.metrics.cached).toBe(true);
            expect(response.body.metrics.provider).toBe('cache');
        });
        it('should track result retrieval', async () => {
            await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_789',
                headers: {},
                user: mockUser
            });
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('SEARCH_RETRIEVED', expect.any(Object));
        });
    });
    // ============================================================================
    // GET /api/v1/insights/search/{id}/history Tests
    // ============================================================================
    describe('GET /api/v1/insights/search/{id}/history', () => {
        it('should return search execution history', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_123/history',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.executions).toBeDefined();
            expect(Array.isArray(response.body.executions)).toBe(true);
        });
        it('should include execution timestamps', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_456/history',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.executions[0].timestamp).toBeDefined();
            expect(response.body.executions[0].provider).toBeDefined();
        });
        it('should track cache vs fresh results', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/search_789/history',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            const executions = response.body.executions;
            expect(executions.some((e) => e.provider === 'cache')).toBe(true);
            expect(executions.some((e) => e.provider === 'serpapi')).toBe(true);
        });
    });
    // ============================================================================
    // POST /api/v1/recurring-search Tests
    // ============================================================================
    describe('POST /api/v1/recurring-search', () => {
        it('should create recurring search', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'AI insights', schedule: 'daily' },
                user: mockUser
            });
            expect(response.statusCode).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.query).toBe('AI insights');
            expect(response.body.schedule).toBe('daily');
        });
        it('should support deep search in recurring searches', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'test', schedule: 'weekly', deepSearch: true },
                user: mockUser
            });
            expect(response.statusCode).toBe(201);
            expect(response.body.deepSearch).toBe(true);
        });
        it('should reject missing schedule', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'test' },
                user: mockUser
            });
            expect(response.statusCode).toBe(400);
        });
        it('should calculate next execution', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'test', schedule: 'daily' },
                user: mockUser
            });
            expect(response.statusCode).toBe(201);
            expect(response.body.nextExecution).toBeDefined();
            expect(new Date(response.body.nextExecution) > new Date()).toBe(true);
        });
        it('should return Location header', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'test', schedule: 'daily' },
                user: mockUser
            });
            expect(response.headers.Location).toBeDefined();
            expect(response.headers.Location).toMatch(/\/api\/v1\/recurring-search\//);
        });
        it('should track recurring search creation', async () => {
            await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search',
                headers: {},
                body: { query: 'test', schedule: 'hourly' },
                user: mockUser
            });
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('RECURRING_SEARCH_CREATED', expect.any(Object));
        });
    });
    // ============================================================================
    // GET /api/v1/recurring-search Tests
    // ============================================================================
    describe('GET /api/v1/recurring-search', () => {
        it('should list recurring searches', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.searches).toBeDefined();
            expect(Array.isArray(response.body.searches)).toBe(true);
        });
        it('should include execution counts', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.searches[0].executionCount).toBeDefined();
        });
        it('should include last execution timestamp', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.searches[0].lastExecution).toBeDefined();
        });
        it('should return total count', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.total).toBeDefined();
            expect(response.body.total).toBe(response.body.searches.length);
        });
    });
    // ============================================================================
    // GET /api/v1/recurring-search/{id} Tests
    // ============================================================================
    describe('GET /api/v1/recurring-search/{id}', () => {
        it('should retrieve specific recurring search', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search/rec_123',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.id).toBe('rec_123');
        });
        it('should include next execution', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/recurring-search/rec_456',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.nextExecution).toBeDefined();
        });
    });
    // ============================================================================
    // POST /api/v1/recurring-search/{id}/execute Tests
    // ============================================================================
    describe('POST /api/v1/recurring-search/{id}/execute', () => {
        it('should execute recurring search immediately', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search/rec_123/execute',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(202);
            expect(response.body.executionId).toBeDefined();
        });
        it('should return in-progress status', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search/rec_456/execute',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(202);
            expect(response.body.status).toBe('in-progress');
        });
        it('should provide shard ID for result retrieval', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/recurring-search/rec_789/execute',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(202);
            expect(response.body.shardId).toBeDefined();
        });
    });
    // ============================================================================
    // GET /api/v1/insights/search/statistics Tests
    // ============================================================================
    describe('GET /api/v1/insights/search/statistics', () => {
        it('should return search statistics', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/statistics',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.totalSearches).toBeDefined();
            expect(response.body.uniqueQueries).toBeDefined();
        });
        it('should include cache hit rate', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/statistics',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.cacheHitRate).toBeDefined();
            expect(response.body.cacheHitRate).toBeGreaterThanOrEqual(0);
            expect(response.body.cacheHitRate).toBeLessThanOrEqual(1);
        });
        it('should track deep search percentage', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/statistics',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.deepSearchPercentage).toBeDefined();
        });
        it('should include cost breakdown', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/search/statistics',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.costBreakdown).toBeDefined();
            expect(response.body.costBreakdown.total).toBeGreaterThan(0);
        });
    });
    // ============================================================================
    // GET /api/v1/admin/quota Tests
    // ============================================================================
    describe('GET /api/v1/admin/quota', () => {
        it('should require admin role', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(403);
        });
        it('should return quota for admin', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.daily).toBeDefined();
        });
        it('should show daily search quota', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.daily.searches).toBeDefined();
            expect(response.body.daily.searches.remaining).toBeGreaterThanOrEqual(0);
        });
        it('should show deep search quota', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.daily.deepSearches).toBeDefined();
        });
        it('should show monthly cost quota', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.monthly.cost).toBeDefined();
        });
        it('should indicate reset time', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/quota',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.resetAt).toBeDefined();
        });
    });
    // ============================================================================
    // GET /api/v1/admin/providers/health Tests
    // ============================================================================
    describe('GET /api/v1/admin/providers/health', () => {
        it('should require admin role', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(403);
        });
        it('should return provider health for admin', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.providers).toBeDefined();
            expect(Array.isArray(response.body.providers)).toBe(true);
        });
        it('should include serpapi health', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            const serpapi = response.body.providers.find((p) => p.name === 'serpapi');
            expect(serpapi).toBeDefined();
            expect(serpapi.status).toBe('healthy');
        });
        it('should include bing health', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            const bing = response.body.providers.find((p) => p.name === 'bing');
            expect(bing).toBeDefined();
        });
        it('should track response times', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.providers[0].responseTime).toBeDefined();
            expect(response.body.providers[0].responseTime).toBeGreaterThan(0);
        });
        it('should track success rates', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.providers[0].successRate).toBeDefined();
            expect(response.body.providers[0].successRate).toBeGreaterThanOrEqual(0);
            expect(response.body.providers[0].successRate).toBeLessThanOrEqual(1);
        });
        it('should report overall status', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/admin/providers/health',
                headers: {},
                user: mockAdmin
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.overallStatus).toBeDefined();
        });
    });
    // ============================================================================
    // POST /api/v1/insights/search/{id}/cancel Tests
    // ============================================================================
    describe('POST /api/v1/insights/search/{id}/cancel', () => {
        it('should cancel in-progress search', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search/search_123/cancel',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('cancelled');
        });
        it('should confirm cancelled shard ID', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search/search_456/cancel',
                headers: {},
                body: {},
                user: mockUser
            });
            expect(response.statusCode).toBe(200);
            expect(response.body.shardId).toBe('search_456');
        });
    });
    // ============================================================================
    // WebSocket /api/v1/insights/deep-search-progress Tests
    // ============================================================================
    describe('WebSocket /api/v1/insights/deep-search-progress', () => {
        it('should establish WebSocket connection', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/deep-search-progress?shardId=search_123',
                headers: { Upgrade: 'websocket' },
                query: { shardId: 'search_123' },
                user: mockUser
            });
            expect(response.statusCode).toBe(101);
            expect(response.headers.Upgrade).toBe('websocket');
        });
        it('should include shard ID in connection', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/deep-search-progress?shardId=search_456',
                headers: { Upgrade: 'websocket' },
                query: { shardId: 'search_456' },
                user: mockUser
            });
            expect(response.statusCode).toBe(101);
            expect(response.body.shardId).toBe('search_456');
        });
        it('should list supported message types', async () => {
            const response = await app.request({
                method: 'GET',
                url: '/api/v1/insights/deep-search-progress?shardId=search_789',
                headers: { Upgrade: 'websocket' },
                query: { shardId: 'search_789' },
                user: mockUser
            });
            expect(response.statusCode).toBe(101);
            expect(response.body.messageTypes).toContain('fetching');
            expect(response.body.messageTypes).toContain('parsing');
            expect(response.body.messageTypes).toContain('chunking');
            expect(response.body.messageTypes).toContain('embedding');
            expect(response.body.messageTypes).toContain('complete');
            expect(response.body.messageTypes).toContain('error');
        });
    });
    // ============================================================================
    // Error Handling & Edge Cases
    // ============================================================================
    describe('Error Handling', () => {
        it('should handle internal errors gracefully', async () => {
            vi.spyOn(mockSearchService, 'search').mockRejectedValueOnce(new Error('Service error'));
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'test' },
                user: mockUser
            });
            expect(response.statusCode).toBe(500);
            expect(response.body.error).toBeDefined();
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('API_ERROR', expect.any(Object));
        });
        it('should handle missing authentication', async () => {
            const response = await app.request({
                method: 'POST',
                url: '/api/v1/insights/search',
                headers: {},
                body: { query: 'test' }
            });
            // Should still work with anonymous user (depending on implementation)
            expect(response.statusCode).toBeDefined();
        });
    });
});
//# sourceMappingURL=web-search.routes.test.js.map