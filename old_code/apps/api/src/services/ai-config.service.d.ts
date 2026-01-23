/**
 * AI Configuration Service
 * Manages system and tenant AI provider configuration
 * Handles model selection hierarchy:
 *   1. Assistant-specific model (if set)
 *   2. Tenant default model (if set)
 *   3. System default model
 */
import { CosmosClient } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { KeyVaultService } from '@castiel/key-vault';
import { AIProviderName, SystemAIConfig, TenantAIConfig, ResolvedAIConfig, UpdateSystemAIConfigInput, UpdateTenantAIConfigInput, AddTenantAICredentialInput, AIUsageRecord } from '../types/ai-provider.types.js';
import type { NotificationService } from './notification.service.js';
import type { UserService } from './auth/user.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class AIConfigService {
    private systemConfigContainer;
    private tenantConfigContainer;
    private usageContainer;
    private redis;
    private keyVault;
    private notificationService?;
    private userService?;
    private monitoring?;
    constructor(cosmosClient: CosmosClient, redis: Redis, keyVault: KeyVaultService, notificationService?: NotificationService, userService?: UserService, monitoring?: IMonitoringProvider);
    /**
     * Set notification services (can be called after initialization)
     */
    setNotificationServices(notificationService: NotificationService, userService: UserService): void;
    /**
     * Get system AI configuration
     */
    getSystemConfig(): Promise<SystemAIConfig>;
    /**
     * Update system AI configuration (Super Admin only)
     */
    updateSystemConfig(input: UpdateSystemAIConfigInput, updatedBy: string): Promise<SystemAIConfig>;
    /**
     * Add system-level AI credentials
     * Now stores API keys in Azure Key Vault instead of encrypting in Cosmos DB
     */
    addSystemCredential(provider: AIProviderName, apiKey: string, endpoint?: string, deploymentMappings?: Record<string, string>, updatedBy?: string): Promise<void>;
    /**
     * Remove system-level AI credentials
     */
    removeSystemCredential(provider: AIProviderName, updatedBy: string): Promise<void>;
    private saveSystemConfig;
    private getDefaultSystemConfig;
    /**
     * Get tenant AI configuration
     */
    getTenantConfig(tenantId: string): Promise<TenantAIConfig | null>;
    /**
     * Update tenant AI configuration (Tenant Admin)
     */
    updateTenantConfig(tenantId: string, input: UpdateTenantAIConfigInput, updatedBy: string): Promise<TenantAIConfig>;
    /**
     * Add tenant's own AI credentials (BYOK)
     * Now stores API keys in Azure Key Vault instead of encrypting in Cosmos DB
     */
    addTenantCredential(tenantId: string, input: AddTenantAICredentialInput, addedBy: string): Promise<void>;
    /**
     * Remove tenant's AI credentials
     */
    removeTenantCredential(tenantId: string, provider: AIProviderName, removedBy: string): Promise<void>;
    /**
     * Toggle tenant credential active status
     */
    toggleTenantCredential(tenantId: string, provider: AIProviderName, isActive: boolean, updatedBy: string): Promise<void>;
    private saveTenantConfig;
    /**
     * Resolve the AI configuration for a request
     * Hierarchy:
     *   1. Assistant-specific model (if provided)
     *   2. Tenant default model
     *   3. System default model
     */
    resolveAIConfig(tenantId: string, assistantModel?: string): Promise<ResolvedAIConfig>;
    /**
     * Get decrypted API key for a provider
     * Now retrieves from Azure Key Vault instead of decrypting from Cosmos DB
     */
    getApiKey(tenantId: string, provider: AIProviderName): Promise<{
        apiKey: string;
        endpoint?: string;
        deploymentMappings?: Record<string, string>;
    } | null>;
    /**
     * Helper: Get tenant admin user IDs
     */
    private getTenantAdminUserIds;
    /**
     * Helper: Send notification to tenant admins
     */
    private notifyTenantAdmins;
    /**
     * Check and send cost alerts if thresholds are exceeded
     */
    private checkAndSendCostAlerts;
    /**
     * Record AI usage for a tenant
     */
    recordUsage(usage: Omit<AIUsageRecord, 'id'> & {
        insightType?: string;
        conversationId?: string;
        connectionId?: string;
    }): Promise<void>;
    /**
     * Get usage statistics for a tenant
     */
    getUsageStats(tenantId: string, startDate: Date, endDate: Date): Promise<{
        totalTokens: number;
        totalCost: number;
        requestCount: number;
        byModel: Record<string, {
            tokens: number;
            cost: number;
            count: number;
        }>;
        byDay: Array<{
            date: string;
            tokens: number;
            cost: number;
        }>;
        byInsightType?: Record<string, {
            tokens: number;
            cost: number;
            count: number;
        }>;
        byUser?: Record<string, {
            tokens: number;
            cost: number;
            count: number;
        }>;
    }>;
    /**
     * Get comprehensive billing summary for a tenant
     */
    getBillingSummary(tenantId: string, startDate: Date, endDate: Date): Promise<{
        totalCost: number;
        totalTokens: number;
        insightCount: number;
        byModel: Array<{
            modelId: string;
            modelName: string;
            cost: number;
            tokens: number;
            requests: number;
        }>;
        byInsightType: Array<{
            insightType: string;
            cost: number;
            tokens: number;
            requests: number;
        }>;
        byUser: Array<{
            userId: string;
            cost: number;
            tokens: number;
            requests: number;
        }>;
        dailyBreakdown: Array<{
            date: string;
            cost: number;
            tokens: number;
            requests: number;
        }>;
        budget?: {
            limit: number;
            used: number;
            remaining: number;
            percentUsed: number;
        };
    }>;
    /**
     * Check if tenant has budget capacity for estimated cost
     * Checks both daily and monthly budgets
     */
    checkBudget(tenantId: string, estimatedCost: number): Promise<{
        hasCapacity: boolean;
        currentUsage: number;
        budgetLimit?: number;
        remaining?: number;
        dailyUsage?: number;
        dailyLimit?: number;
        dailyRemaining?: number;
        blockedBy?: 'daily' | 'monthly';
    }>;
    /**
     * Get available models for a tenant
     */
    getAvailableModels(tenantId: string): Promise<{
        chatModels: Array<{
            id: string;
            name: string;
            provider: string;
        }>;
        embeddingModels: Array<{
            id: string;
            name: string;
            provider: string;
        }>;
        currentChatModel: string;
        currentEmbeddingModel: string;
    }>;
    /**
     * Get all available providers with their configuration status
     */
    getAvailableProviders(tenantId: string): Promise<Array<{
        provider: AIProviderName;
        displayName: string;
        description: string;
        icon: string;
        color: string;
        isConfigured: boolean;
        credentialSource: 'system' | 'tenant' | 'none';
        isAllowed: boolean;
    }>>;
    /**
     * Generate a Key Vault secret name for an AI provider credential
     * Format: ai-provider-{provider}-{tenantId or 'system'}
     */
    private getProviderSecretName;
    /**
     * Store API key in Azure Key Vault
     * Automatically stores the secret and returns the secret reference name
     */
    private storeApiKeyInKeyVault;
    /**
     * Retrieve API key from Azure Key Vault
     */
    private retrieveApiKeyFromKeyVault;
    /**
     * @deprecated Use Key Vault instead
     * Legacy encryption method for backward compatibility
     */
    private encryptApiKey;
    /**
     * @deprecated Use Key Vault instead
     * Legacy decryption method for backward compatibility
     */
    private decryptApiKey;
    ensureContainers(): Promise<void>;
}
//# sourceMappingURL=ai-config.service.d.ts.map