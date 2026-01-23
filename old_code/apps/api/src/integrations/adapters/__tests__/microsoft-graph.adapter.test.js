/**
 * Microsoft Graph Adapter Unit Tests
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { MicrosoftGraphAdapter, MICROSOFT_GRAPH_DEFINITION } from '../microsoft-graph.adapter.js';
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
describe('MicrosoftGraphAdapter', () => {
    let adapter;
    const tenantId = 'test-tenant';
    const connectionId = 'test-connection';
    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new MicrosoftGraphAdapter(mockMonitoring, mockConnectionService, tenantId, connectionId);
        global.fetch.mockClear();
    });
    describe('getDefinition', () => {
        it('should return Microsoft Graph integration definition', () => {
            const definition = adapter.getDefinition();
            expect(definition).toBe(MICROSOFT_GRAPH_DEFINITION);
            expect(definition.id).toBe('microsoft-graph');
            expect(definition.name).toBe('microsoft_graph');
            expect(definition.displayName).toBe('Microsoft Graph');
        });
    });
    describe('testConnection', () => {
        it('should successfully test connection', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    displayName: 'Test User',
                    mail: 'test@example.com',
                }),
            });
            const result = await adapter.testConnection();
            expect(result.success).toBe(true);
            expect(result.details?.user).toBe('Test User');
            expect(result.details?.email).toBe('test@example.com');
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
            expect(entityNames).toContain('onedrive_file');
            expect(entityNames).toContain('onedrive_folder');
            expect(entityNames).toContain('teams_message');
            expect(entityNames).toContain('teams_channel');
            expect(entityNames).toContain('teams_team');
        });
    });
    describe('getEntitySchema', () => {
        it('should return schema for onedrive_file entity', async () => {
            const schema = await adapter.getEntitySchema('onedrive_file');
            expect(schema).toBeDefined();
            expect(schema?.name).toBe('onedrive_file');
            expect(schema?.displayName).toBe('OneDrive File');
            expect(schema?.fields).toBeDefined();
            expect(schema?.fields.length).toBeGreaterThan(0);
        });
        it('should return schema for teams_message entity', async () => {
            const schema = await adapter.getEntitySchema('teams_message');
            expect(schema).toBeDefined();
            expect(schema?.name).toBe('teams_message');
            expect(schema?.displayName).toBe('Teams Message');
        });
        it('should return null for unknown entity', async () => {
            const schema = await adapter.getEntitySchema('unknown_entity');
            expect(schema).toBeNull();
        });
    });
    describe('fetch', () => {
        it('should fetch OneDrive files', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    value: [
                        {
                            id: 'file1',
                            name: 'test.docx',
                            webUrl: 'https://onedrive.live.com/file1',
                            size: 1024,
                            createdDateTime: '2024-01-01T00:00:00Z',
                            lastModifiedDateTime: '2024-01-02T00:00:00Z',
                        },
                    ],
                }),
            });
            const result = await adapter.fetch({
                entity: 'onedrive_file',
                limit: 10,
            });
            expect(result.records).toBeDefined();
            expect(result.records.length).toBe(1);
            expect(result.records[0].id).toBe('file1');
            expect(result.records[0].name).toBe('test.docx');
        });
        it('should fetch Teams messages', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    value: [
                        {
                            id: 'msg1',
                            body: { content: 'Test message' },
                            createdDateTime: '2024-01-01T00:00:00Z',
                            from: { user: { displayName: 'User' } },
                            channelIdentity: { teamId: 'team1', channelId: 'channel1' },
                        },
                    ],
                }),
            });
            const result = await adapter.fetch({
                entity: 'teams_message',
                filters: { teamId: 'team1', channelId: 'channel1' },
            });
            expect(result.records).toBeDefined();
            expect(result.records.length).toBe(1);
            expect(result.records[0].id).toBe('msg1');
        });
        it('should handle fetch errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });
            const result = await adapter.fetch({
                entity: 'onedrive_file',
            });
            expect(result.records).toEqual([]);
            expect(result.hasMore).toBe(false);
        });
    });
    describe('push', () => {
        it('should create OneDrive file', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: async () => ({
                    id: 'new-file-id',
                    name: 'new-file.docx',
                }),
            });
            const result = await adapter.push({
                name: 'new-file.docx',
                parentId: 'parent-folder-id',
            }, {
                entity: 'onedrive_file',
                operation: 'create',
            });
            expect(result.success).toBe(true);
            expect(result.externalId).toBe('new-file-id');
        });
        it('should update OneDrive file', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'file-id',
                    name: 'updated-file.docx',
                }),
            });
            const result = await adapter.push({
                id: 'file-id',
                name: 'updated-file.docx',
            }, {
                entity: 'onedrive_file',
                operation: 'update',
            });
            expect(result.success).toBe(true);
        });
        it('should require id for update operation', async () => {
            const result = await adapter.push({
                name: 'file.docx',
            }, {
                entity: 'onedrive_file',
                operation: 'update',
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('Id required');
        });
    });
    describe('search', () => {
        it('should search OneDrive files', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    value: [
                        {
                            id: 'file1',
                            name: 'test.docx',
                            webUrl: 'https://onedrive.live.com/file1',
                            createdDateTime: '2024-01-01T00:00:00Z',
                            lastModifiedDateTime: '2024-01-02T00:00:00Z',
                        },
                    ],
                }),
            });
            const result = await adapter.search({
                query: 'test',
                entities: ['onedrive_file'],
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
                entities: ['onedrive_file'],
            });
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });
    });
    describe('parseWebhook', () => {
        it('should parse Microsoft Graph webhook payload', () => {
            const payload = {
                value: [
                    {
                        subscriptionId: 'sub1',
                        changeType: 'created',
                        resource: 'me/drive/items/file1',
                        resourceData: {
                            id: 'file1',
                            name: 'test.docx',
                        },
                        occurredAt: '2024-01-01T00:00:00Z',
                    },
                ],
            };
            const event = adapter.parseWebhook(payload, {});
            expect(event).toBeDefined();
            expect(event?.type).toBe('created');
            expect(event?.entity).toBe('me/drive/items/file1');
            expect(event?.externalId).toBe('file1');
            expect(event?.operation).toBe('create');
        });
        it('should return null for invalid webhook payload', () => {
            const payload = { invalid: 'data' };
            const event = adapter.parseWebhook(payload, {});
            expect(event).toBeNull();
        });
    });
});
//# sourceMappingURL=microsoft-graph.adapter.test.js.map