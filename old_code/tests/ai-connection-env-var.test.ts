import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIConnectionService } from '../apps/api/src/services/ai/ai-connection.service';
import { AIModelService } from '../apps/api/src/services/ai/ai-model.service';
import { KeyVaultService } from '@castiel/key-vault';
import { IMonitoringProvider } from '@castiel/monitoring';

// Mock dependencies
vi.mock('@azure/cosmos', () => {
    return {
        CosmosClient: class {
            database = vi.fn().mockReturnValue({
                container: vi.fn().mockReturnValue({
                    items: {
                        create: vi.fn().mockResolvedValue({ resource: {} }),
                        query: vi.fn().mockReturnValue({
                            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
                        }),
                    },
                    item: vi.fn().mockReturnValue({
                        read: vi.fn(),
                        replace: vi.fn(),
                        delete: vi.fn(),
                    }),
                }),
            });
        },
        VectorEmbeddingDataType: { Float32: 'float32' },
        VectorEmbeddingDistanceFunction: { Cosine: 'cosine' },
    };
});

vi.mock('../apps/api/src/services/ai/ai-model.service');
vi.mock('@castiel/key-vault');
vi.mock('../apps/api/src/repositories/shard.repository');
vi.mock('../apps/api/src/repositories/shard-type.repository');
vi.mock('../apps/api/src/config/env.js', () => ({
    config: {
        cosmosDb: {
            endpoint: 'https://test.documents.azure.com',
            key: 'test-key',
            databaseId: 'test-db',
            containers: {
                aiConnections: 'ai-connections',
                aiModels: 'ai-models',
            },
        },
    },
}));

describe('AIConnectionService - Env Var Support', () => {
    let service: AIConnectionService;
    let mockMonitoring: IMonitoringProvider;
    let mockKeyVault: KeyVaultService;
    let mockModelService: any;

    beforeEach(() => {
        mockMonitoring = {
            trackEvent: vi.fn(),
            trackException: vi.fn(),
            trackMetric: vi.fn(),
            trackDependency: vi.fn(),
            trackRequest: vi.fn(),
            trackTrace: vi.fn(),
        };

        mockKeyVault = {
            setSecret: vi.fn(),
            getSecret: vi.fn(),
            deleteSecret: vi.fn(),
        } as any;

        mockModelService = {
            getModel: vi.fn(),
        };
        (AIModelService as any).mockImplementation(function () { return mockModelService; });

        // Mock other repositories if needed, though they might be auto-mocked correctly if they are classes.
        // If auto-mocked, they are already constructible spies.
        // But if we need to control them:
        // (ShardRepository as any).mockImplementation(function() {});
        // (ShardTypeRepository as any).mockImplementation(function() {});

        service = new AIConnectionService(mockMonitoring, undefined, mockKeyVault);
        // Inject mock model service to bypass internal instantiation
        (service as any).modelService = mockModelService;
    });

    it('should create a connection using environment variable without Key Vault', async () => {
        const input = {
            name: 'Test Env Connection',
            modelId: 'model-1',
            endpoint: 'https://api.openai.com',
            apiKeyEnvVar: 'TEST_API_KEY',
        };

        mockModelService.getModel.mockResolvedValue({
            id: 'model-1',
            provider: 'OpenAI',
            type: 'LLM',
            allowTenantConnections: true,
        });

        // Mock container create
        const mockCreate = vi.fn().mockResolvedValue({
            resource: {
                id: 'conn-1',
                ...input,
                status: 'active',
            },
        });
        (service as any).container.items.create = mockCreate;

        await service.createConnection(input as any, 'user-1');

        // Verify Key Vault was NOT called
        expect(mockKeyVault.setSecret).not.toHaveBeenCalled();

        // Verify DB create was called with apiKeyEnvVar
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            apiKeyEnvVar: 'TEST_API_KEY',
            secretId: undefined,
        }));
    });

    it('should retrieve credentials from environment variable', async () => {
        const connectionId = 'conn-1';
        const apiKeyEnvVar = 'TEST_RETRIEVE_KEY';
        const apiKeyValue = 'sk-test-12345';

        process.env[apiKeyEnvVar] = apiKeyValue;

        // Mock connection retrieval
        (service as any).container.item = vi.fn().mockReturnValue({
            read: vi.fn().mockResolvedValue({
                resource: {
                    id: connectionId,
                    modelId: 'model-1',
                    apiKeyEnvVar,
                },
            }),
        });

        mockModelService.getModel.mockResolvedValue({
            id: 'model-1',
            provider: 'OpenAI',
        });

        const result = await service.getConnectionWithCredentials(connectionId);

        expect(result).not.toBeNull();
        expect(result?.apiKey).toBe(apiKeyValue);
        expect(mockKeyVault.getSecret).not.toHaveBeenCalled();

        // Cleanup
        delete process.env[apiKeyEnvVar];
    });

    it('should throw error if env var is missing during retrieval', async () => {
        const connectionId = 'conn-1';
        const apiKeyEnvVar = 'MISSING_KEY';

        // Ensure env var is not set
        delete process.env[apiKeyEnvVar];

        (service as any).container.item = vi.fn().mockReturnValue({
            read: vi.fn().mockResolvedValue({
                resource: {
                    id: connectionId,
                    modelId: 'model-1',
                    apiKeyEnvVar,
                },
            }),
        });

        mockModelService.getModel.mockResolvedValue({
            id: 'model-1',
            provider: 'OpenAI',
        });

        await expect(service.getConnectionWithCredentials(connectionId))
            .rejects.toThrow(`Environment variable not found: ${apiKeyEnvVar}`);
    });
});
