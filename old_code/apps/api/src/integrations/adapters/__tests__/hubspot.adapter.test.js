/**
 * HubSpot Adapter Unit Tests
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { HubSpotAdapter, HUBSPOT_DEFINITION } from '../hubspot.adapter.js';
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
        refreshToken: 'mock-refresh-token',
    }),
};
// Mock fetch globally
global.fetch = vi.fn();
describe('HubSpotAdapter', () => {
    let adapter;
    const tenantId = 'test-tenant';
    const connectionId = 'test-connection';
    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new HubSpotAdapter(mockMonitoring, mockConnectionService, tenantId, connectionId);
        global.fetch.mockClear();
    });
    describe('getDefinition', () => {
        it('should return HubSpot integration definition', () => {
            const definition = adapter.getDefinition();
            expect(definition).toBe(HUBSPOT_DEFINITION);
            expect(definition.id).toBe('hubspot');
            expect(definition.name).toBe('hubspot');
            expect(definition.displayName).toBe('HubSpot');
        });
    });
    describe('testConnection', () => {
        it('should successfully test connection', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    user: 'test@example.com',
                }),
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(true);
            expect(result.details?.user).toBe('test@example.com');
        });
        it('should handle connection test failure', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe('listEntities', () => {
        it('should return list of available entities', async () => {
            const entities = await adapter.listEntities();
            expect(entities).toBeDefined();
            expect(Array.isArray(entities)).toBe(true);
            expect(entities.length).toBeGreaterThan(0);
            const entityNames = entities.map(e => e.name);
            expect(entityNames).toContain('contact');
            expect(entityNames).toContain('company');
            expect(entityNames).toContain('deal');
            expect(entityNames).toContain('ticket');
        });
    });
    describe('getEntitySchema', () => {
        it('should return schema for contact entity', async () => {
            const schema = await adapter.getEntitySchema('contact');
            expect(schema).toBeDefined();
            expect(schema?.name).toBe('contact');
            expect(schema?.displayName).toBe('Contact');
            expect(schema?.fields).toBeDefined();
            expect(schema?.fields.length).toBeGreaterThan(0);
        });
        it('should return schema for company entity', async () => {
            const schema = await adapter.getEntitySchema('company');
            expect(schema).toBeDefined();
            expect(schema?.name).toBe('company');
            expect(schema?.displayName).toBe('Company');
        });
        it('should return null for unknown entity', async () => {
            const schema = await adapter.getEntitySchema('unknown_entity');
            expect(schema).toBeNull();
        });
    });
    describe('fetch', () => {
        it('should fetch contacts', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    results: [
                        {
                            id: 'contact1',
                            properties: {
                                firstname: 'John',
                                lastname: 'Doe',
                                email: 'john@example.com',
                            },
                            createdAt: '2024-01-01T00:00:00Z',
                            updatedAt: '2024-01-02T00:00:00Z',
                        },
                    ],
                }),
            });
            const result = await adapter.fetch({
                entity: 'contact',
                limit: 10,
            });
            expect(result.records).toBeDefined();
            expect(result.records.length).toBe(1);
            expect(result.records[0].id).toBe('contact1');
            expect(result.records[0].firstname).toBe('John');
        });
        it('should fetch companies', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    results: [
                        {
                            id: 'company1',
                            properties: {
                                name: 'Acme Corp',
                                domain: 'acme.com',
                            },
                            createdAt: '2024-01-01T00:00:00Z',
                            updatedAt: '2024-01-02T00:00:00Z',
                        },
                    ],
                }),
            });
            const result = await adapter.fetch({
                entity: 'company',
                limit: 10,
            });
            expect(result.records).toBeDefined();
            expect(result.records.length).toBe(1);
            expect(result.records[0].id).toBe('company1');
        });
        it('should handle fetch errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });
            const result = await adapter.fetch({
                entity: 'contact',
            });
            expect(result.records).toEqual([]);
            expect(result.hasMore).toBe(false);
        });
    });
    describe('push', () => {
        it('should create contact', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: async () => ({
                    id: 'new-contact-id',
                    properties: {
                        firstname: 'Jane',
                        lastname: 'Smith',
                        email: 'jane@example.com',
                    },
                }),
            });
            const result = await adapter.push({
                firstname: 'Jane',
                lastname: 'Smith',
                email: 'jane@example.com',
            }, {
                entity: 'contact',
                operation: 'create',
            });
            expect(result.success).toBe(true);
            expect(result.externalId).toBe('new-contact-id');
        });
        it('should update contact', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'contact-id',
                    properties: {
                        firstname: 'Updated',
                        lastname: 'Name',
                    },
                }),
            });
            const result = await adapter.push({
                id: 'contact-id',
                firstname: 'Updated',
                lastname: 'Name',
            }, {
                entity: 'contact',
                operation: 'update',
            });
            expect(result.success).toBe(true);
        });
        it('should require id for update operation', async () => {
            const result = await adapter.push({
                firstname: 'John',
            }, {
                entity: 'contact',
                operation: 'update',
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('Id required');
        });
    });
    describe('search', () => {
        it('should search contacts', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    results: [
                        {
                            id: 'contact1',
                            properties: {
                                firstname: 'John',
                                lastname: 'Doe',
                                email: 'john@example.com',
                            },
                            createdAt: '2024-01-01T00:00:00Z',
                            updatedAt: '2024-01-02T00:00:00Z',
                        },
                    ],
                }),
            });
            const result = await adapter.search({
                query: 'john',
                entities: ['contact'],
                limit: 10,
            });
            expect(result.results).toBeDefined();
            expect(result.results.length).toBeGreaterThan(0);
            expect(result.total).toBeGreaterThan(0);
        });
        it('should handle search errors gracefully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });
            const result = await adapter.search({
                query: 'test',
                entities: ['contact'],
            });
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });
    });
    describe('parseWebhook', () => {
        it('should parse HubSpot webhook payload', () => {
            const payload = {
                subscriptionId: 'sub1',
                eventId: 'event1',
                events: [
                    {
                        subscriptionType: 'contact.creation',
                        objectType: 'contact',
                        objectId: 'contact1',
                        eventType: 'contact.creation',
                        properties: {
                            firstname: 'John',
                            lastname: 'Doe',
                        },
                        occurredAt: '2024-01-01T00:00:00Z',
                    },
                ],
            };
            const event = adapter.parseWebhook(payload, {});
            expect(event).toBeDefined();
            expect(event?.type).toBe('contact.creation');
            expect(event?.entity).toBe('contact');
            expect(event?.externalId).toBe('contact1');
            expect(event?.operation).toBe('create');
        });
        it('should return null for invalid webhook payload', () => {
            const payload = { invalid: 'data' };
            const event = adapter.parseWebhook(payload, {});
            expect(event).toBeNull();
        });
    });
});
//# sourceMappingURL=hubspot.adapter.test.js.map