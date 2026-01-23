/**
 * Custom Integration Service
 * Executes user-defined REST API, Webhook, and GraphQL integrations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { CredentialEncryptionService } from './credential-encryption.service.js';
import { CustomIntegrationDefinition, TestResult, CustomIntegrationExecuteResult } from '../types/custom-integration.types.js';
export declare class CustomIntegrationService {
    private readonly shardRepository;
    private readonly shardTypeRepository;
    private readonly encryptionService;
    private readonly monitoring;
    constructor(shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, encryptionService: CredentialEncryptionService, monitoring: IMonitoringProvider);
    /**
     * Execute an endpoint on a custom integration
     */
    executeEndpoint(integration: CustomIntegrationDefinition, endpointId: string, params?: Record<string, unknown>, body?: unknown): Promise<CustomIntegrationExecuteResult>;
    /**
     * Test integration connection
     */
    testConnection(integration: CustomIntegrationDefinition): Promise<TestResult>;
    /**
     * Test a specific endpoint
     */
    testEndpoint(integration: CustomIntegrationDefinition, endpointId: string, testParams?: Record<string, unknown>, testBody?: unknown): Promise<TestResult>;
    /**
     * Process incoming webhook
     */
    processWebhook(integration: CustomIntegrationDefinition, payload: unknown, signature?: string): Promise<{
        success: boolean;
        error?: string;
        processed: number;
    }>;
    /**
     * Generate webhook URL for an integration
     */
    generateWebhookUrl(integrationId: string, secret: string): string;
    /**
     * Generate a new webhook secret
     */
    generateWebhookSecret(): string;
    private buildUrl;
    private buildHeaders;
    private applyAuth;
    private buildBody;
    private interpolateTemplate;
    private executeRequest;
    private applyResponseMapping;
    private previewMapping;
    private applyTransform;
    private extractJsonPath;
    private verifyWebhookSignature;
    private processWebhookEvent;
    private sanitizeHeaders;
}
//# sourceMappingURL=custom-integration.service.d.ts.map