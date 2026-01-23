/**
 * Notion Adapter Unit Tests
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { NotionAdapter, NOTION_DEFINITION } from '../notion.adapter.js';
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
        type: 'oauth2',
        accessToken: 'mock-access-token',
    }),
};
describe('NotionAdapter', () => {
    let adapter;
    const tenantId = 'test-tenant';
    const connectionId = 'test-connection';
    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new NotionAdapter(mockMonitoring, mockConnectionService, tenantId, connectionId);
    });
    describe('getDefinition', () => {
        it('should return Notion integration definition', () => {
            const definition = adapter.getDefinition();
            expect(definition).toBe(NOTION_DEFINITION);
            expect(definition.id).toBe('notion');
            expect(definition.category).toBe(expect.any(String));
        });
        it('should have OAuth configuration', () => {
            const definition = adapter.getDefinition();
            expect(definition.authType).toBe('oauth2');
            expect(definition.oauthConfig).toBeDefined();
            expect(definition.oauthConfig?.scopes).toBeDefined();
            expect(definition.oauthConfig?.scopes?.length).toBeGreaterThan(0);
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
            // Mock makeRequest to return success
            vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                data: { object: 'user', id: 'test-user-id' },
                error: null,
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(true);
        });
        it('should handle connection test failure', async () => {
            // Mock makeRequest to return error
            vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                data: null,
                error: 'Connection failed',
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe('fetch', () => {
        it('should fetch records successfully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock makeRequest to return Notion API response
                vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                    data: {
                        object: 'list',
                        results: [
                            { id: 'page-1', object: 'page', properties: {} },
                            { id: 'page-2', object: 'page', properties: {} },
                        ],
                        has_more: false,
                    },
                    error: null,
                });
                const result = await adapter.fetch({
                    entity,
                    limit: 10,
                });
                expect(result.records).toBeDefined();
                expect(Array.isArray(result.records)).toBe(true);
            }
        });
        it('should handle fetch errors gracefully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock makeRequest to return error
                vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                    data: null,
                    error: 'API Error',
                });
                const result = await adapter.fetch({
                    entity,
                    limit: 10,
                });
                expect(result.records).toEqual([]);
                expect(result.hasMore).toBe(false);
            }
        });
    });
    describe('push', () => {
        it('should create record successfully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock makeRequest to return success
                vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                    data: { id: 'new-page-id', object: 'page' },
                    error: null,
                });
                const result = await adapter.push({ properties: {} }, {
                    entity,
                    operation: 'create',
                });
                expect(result.success).toBe(true);
            }
        });
        it('should handle push errors gracefully', async () => {
            const definition = adapter.getDefinition();
            if (definition.availableEntities.length > 0) {
                const entity = definition.availableEntities[0].name;
                // Mock makeRequest to return error
                vi.spyOn(adapter, 'makeRequest').mockResolvedValue({
                    data: null,
                    error: 'Push failed',
                });
                const result = await adapter.push({ properties: {} }, {
                    entity,
                    operation: 'create',
                });
                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=notion.adapter.test.js.map