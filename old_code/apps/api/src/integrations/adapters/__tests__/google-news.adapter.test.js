/**
 * Google News Adapter Unit Tests
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleNewsAdapter, GOOGLE_NEWS_DEFINITION } from '../google-news.adapter.js';
// Mock dependencies
const mockMonitoring = {
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackMetric: vi.fn(),
    trackTrace: vi.fn(),
    trackDependency: vi.fn(),
    trackRequest: vi.fn(),
    flush: vi.fn(),
    setUser: vi.fn(),
    setAuthenticatedUserContext: vi.fn(),
    clearAuthenticatedUserContext: vi.fn(),
    setOperationId: vi.fn(),
    setOperationName: vi.fn(),
    setOperationParentId: vi.fn(),
    setCustomProperty: vi.fn(),
    setCustomMeasurement: vi.fn(),
    startOperation: vi.fn(),
    endOperation: vi.fn(),
    getCorrelationContext: vi.fn(),
    setCorrelationContext: vi.fn(),
};
const mockConnectionService = {
    getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
    getConnection: vi.fn(),
    testConnection: vi.fn(),
    getDecryptedCredentials: vi.fn().mockResolvedValue({
        type: 'api_key',
        apiKey: 'mock-api-key',
    }),
};
describe('GoogleNewsAdapter', () => {
    let adapter;
    const tenantId = 'test-tenant';
    const connectionId = 'test-connection';
    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new GoogleNewsAdapter(mockMonitoring, mockConnectionService, tenantId, connectionId);
    });
    describe('getDefinition', () => {
        it('should return Google News integration definition', () => {
            const definition = adapter.getDefinition();
            expect(definition).toBe(GOOGLE_NEWS_DEFINITION);
            expect(definition.id).toBe('google-news');
            expect(definition.category).toBe(expect.any(String));
        });
        it('should have API key authentication', () => {
            const definition = adapter.getDefinition();
            expect(definition.authType).toBe('api_key');
        });
        it('should have available entities', () => {
            const definition = adapter.getDefinition();
            expect(definition.availableEntities).toBeDefined();
            expect(Array.isArray(definition.availableEntities)).toBe(true);
            expect(definition.availableEntities.length).toBeGreaterThan(0);
        });
    });
    describe('listEntities', () => {
        it('should return all available entities', async () => {
            const entities = await adapter.listEntities();
            expect(Array.isArray(entities)).toBe(true);
            expect(entities.length).toBeGreaterThan(0);
            // Verify entity structure
            entities.forEach(entity => {
                expect(entity).toHaveProperty('name');
                expect(entity).toHaveProperty('displayName');
                expect(entity).toHaveProperty('fields');
            });
        });
    });
    describe('getEntitySchema', () => {
        it('should return schema for valid entity', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const firstEntity = definition.availableEntities[0];
                const schema = await adapter.getEntitySchema(firstEntity.name);
                expect(schema).toBeDefined();
                expect(schema?.name).toBe(firstEntity.name);
                expect(schema?.fields).toBeDefined();
            }
        });
        it('should return null for invalid entity', async () => {
            const schema = await adapter.getEntitySchema('invalid-entity-name');
            expect(schema).toBeNull();
        });
    });
    describe('testConnection', () => {
        it('should test connection successfully', async () => {
            // Mock fetchFromNewsAPI to return success
            vi.spyOn(adapter, 'fetchFromNewsAPI').mockResolvedValue({
                records: [{ id: 'test-article', title: 'Test' }],
                hasMore: false,
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(true);
        });
        it('should handle connection test failure when API key is missing', async () => {
            // Mock getDecryptedCredentials to return null
            mockConnectionService.getDecryptedCredentials.mockResolvedValueOnce(null);
            const result = await adapter.testConnection();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe('fetch', () => {
        it('should fetch articles successfully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock fetchFromNewsAPI to return articles
                vi.spyOn(adapter, 'fetchFromNewsAPI').mockResolvedValue({
                    records: [
                        { id: 'article-1', title: 'Article 1', publishedAt: '2024-01-01' },
                        { id: 'article-2', title: 'Article 2', publishedAt: '2024-01-02' },
                    ],
                    hasMore: false,
                });
                const result = await adapter.fetch({
                    entity,
                    limit: 10,
                });
                expect(result.records).toBeDefined();
                expect(Array.isArray(result.records)).toBe(true);
                expect(result.hasMore).toBe(false);
            }
        });
        it('should handle fetch errors gracefully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock fetchFromNewsAPI to throw error
                vi.spyOn(adapter, 'fetchFromNewsAPI').mockRejectedValue(new Error('API Error'));
                const result = await adapter.fetch({
                    entity,
                    limit: 10,
                });
                expect(result.records).toEqual([]);
                expect(result.hasMore).toBe(false);
            }
        });
    });
    describe('search', () => {
        it('should search articles successfully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock fetchFromNewsAPI to return search results
                vi.spyOn(adapter, 'fetchFromNewsAPI').mockResolvedValue({
                    records: [
                        { id: 'article-1', title: 'Match 1' },
                        { id: 'article-2', title: 'Match 2' },
                    ],
                    hasMore: false,
                });
                const result = await adapter.search({
                    entity,
                    query: 'test',
                });
                expect(result.items).toBeDefined();
                expect(Array.isArray(result.items)).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=google-news.adapter.test.js.map