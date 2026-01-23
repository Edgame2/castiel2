/**
 * AI Configuration Service
 * Manages system and tenant AI provider configuration
 * Handles model selection hierarchy:
 *   1. Assistant-specific model (if set)
 *   2. Tenant default model (if set)
 *   3. System default model
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { Redis } from 'ioredis';
import crypto from 'crypto';
import { KeyVaultService, SecretName } from '@castiel/key-vault';
import {
  AIProviderName,
  SystemAIConfig,
  TenantAIConfig,
  ResolvedAIConfig,
  UpdateSystemAIConfigInput,
  UpdateTenantAIConfigInput,
  AddTenantAICredentialInput,
  AIUsageRecord,
  AI_PROVIDERS,
  getModelById,
  getProviderByModelId,
  DEFAULT_MODEL_SELECTION_CONFIG,
} from '../types/ai-provider.types.js';
import { config } from '../config/env.js';
import type { NotificationService, UserService } from '@castiel/api-core';
import { IMonitoringProvider } from '@castiel/monitoring';

const CACHE_PREFIX = 'ai-config:';
const SYSTEM_CONFIG_ID = 'system-ai-config';
const CACHE_TTL = 300; // 5 minutes

// Encryption for API keys
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.AI_CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export class AIConfigService {
  private systemConfigContainer: Container;
  private tenantConfigContainer: Container;
  private usageContainer: Container;
  private redis: Redis;
  private keyVault: KeyVaultService;
  private notificationService?: NotificationService;
  private userService?: UserService;
  private monitoring?: IMonitoringProvider;

  constructor(
    cosmosClient: CosmosClient,
    redis: Redis,
    keyVault: KeyVaultService,
    notificationService?: NotificationService,
    userService?: UserService,
    monitoring?: IMonitoringProvider
  ) {
    const database = cosmosClient.database(config.cosmosDb.databaseId);
    this.systemConfigContainer = database.container('systemConfig');
    this.tenantConfigContainer = database.container('tenantAIConfig');
    this.usageContainer = database.container('aiUsage');
    this.redis = redis;
    this.keyVault = keyVault;
    this.notificationService = notificationService;
    this.userService = userService;
    this.monitoring = monitoring;
  }

  /**
   * Set notification services (can be called after initialization)
   */
  setNotificationServices(notificationService: NotificationService, userService: UserService): void {
    this.notificationService = notificationService;
    this.userService = userService;
  }

  // ============================================
  // System Configuration (Super Admin)
  // ============================================

  /**
   * Get system AI configuration
   */
  async getSystemConfig(): Promise<SystemAIConfig> {
    // Check cache
    const cached = await this.redis.get(`${CACHE_PREFIX}system`);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const { resource } = await this.systemConfigContainer.item(SYSTEM_CONFIG_ID, SYSTEM_CONFIG_ID).read<SystemAIConfig>();
      
      if (resource) {
        await this.redis.setex(`${CACHE_PREFIX}system`, CACHE_TTL, JSON.stringify(resource));
        return resource;
      }
    } catch (error: any) {
      if (error.code !== 404) {throw error;}
    }

    // Return default config if none exists
    const defaultConfig = this.getDefaultSystemConfig();
    await this.saveSystemConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Update system AI configuration (Super Admin only)
   */
  async updateSystemConfig(
    input: UpdateSystemAIConfigInput,
    updatedBy: string
  ): Promise<SystemAIConfig> {
    const current = await this.getSystemConfig();

    // Merge modelSelection if provided
    let modelSelection = current.modelSelection || DEFAULT_MODEL_SELECTION_CONFIG;
    if (input.modelSelection) {
      modelSelection = {
        ...modelSelection,
        ...input.modelSelection,
        scoringWeights: {
          ...modelSelection.scoringWeights,
          ...input.modelSelection.scoringWeights,
        },
        complexityThresholds: {
          ...modelSelection.complexityThresholds,
          ...input.modelSelection.complexityThresholds,
        },
        costOptimization: {
          ...modelSelection.costOptimization,
          ...input.modelSelection.costOptimization,
        },
        fallback: {
          ...modelSelection.fallback,
          ...input.modelSelection.fallback,
        },
        performanceBasedSelection: input.modelSelection.performanceBasedSelection !== undefined
          ? {
              ...modelSelection.performanceBasedSelection,
              ...input.modelSelection.performanceBasedSelection,
            }
          : modelSelection.performanceBasedSelection,
        insightTypePreferences: input.modelSelection.insightTypePreferences !== undefined
          ? input.modelSelection.insightTypePreferences
          : modelSelection.insightTypePreferences,
        tenantOverrides: {
          ...modelSelection.tenantOverrides,
          ...input.modelSelection.tenantOverrides,
        },
      };
    }

    const updated: SystemAIConfig = {
      ...current,
      ...input,
      globalRateLimits: {
        ...current.globalRateLimits,
        ...input.globalRateLimits,
      },
      costControls: {
        ...current.costControls,
        ...input.costControls,
      },
      features: {
        ...current.features,
        ...input.features,
      },
      modelSelection,
      updatedAt: new Date(),
      updatedBy,
    };

    await this.saveSystemConfig(updated);
    return updated;
  }

  /**
   * Add system-level AI credentials
   * Now stores API keys in Azure Key Vault instead of encrypting in Cosmos DB
   */
  async addSystemCredential(
    provider: AIProviderName,
    apiKey: string,
    endpoint?: string,
    deploymentMappings?: Record<string, string>,
    updatedBy?: string
  ): Promise<void> {
    const config = await this.getSystemConfig();
    
    // Store API key in Key Vault and get the secret reference
    const keyVaultSecretName = await this.storeApiKeyInKeyVault(provider, apiKey);
    
    const credentials = config.systemCredentials || [];
    const existingIndex = credentials.findIndex(c => c.provider === provider);
    
    // Store the Key Vault secret name as reference instead of encrypted key
    const newCredential = {
      provider,
      encryptedApiKey: keyVaultSecretName, // Now stores Key Vault secret name
      endpoint,
      deploymentMappings,
    };

    if (existingIndex >= 0) {
      credentials[existingIndex] = newCredential;
    } else {
      credentials.push(newCredential);
    }

    await this.updateSystemConfig(
      { ...config, systemCredentials: credentials } as any,
      updatedBy || 'system'
    );
  }

  /**
   * Remove system-level AI credentials
   */
  async removeSystemCredential(
    provider: AIProviderName,
    updatedBy: string
  ): Promise<void> {
    const config = await this.getSystemConfig();
    
    if (config.systemCredentials) {
      config.systemCredentials = config.systemCredentials.filter(c => c.provider !== provider);
      await this.saveSystemConfig({
        ...config,
        updatedAt: new Date(),
        updatedBy,
      });
    }
  }

  private async saveSystemConfig(config: SystemAIConfig): Promise<void> {
    await this.systemConfigContainer.items.upsert({
      ...config,
      id: SYSTEM_CONFIG_ID,
      partitionKey: SYSTEM_CONFIG_ID,
    });
    await this.redis.setex(`${CACHE_PREFIX}system`, CACHE_TTL, JSON.stringify(config));
  }

  private getDefaultSystemConfig(): SystemAIConfig {
    return {
      id: SYSTEM_CONFIG_ID,
      defaultProvider: 'azure_openai',
      defaultModel: 'gpt-4o',
      defaultEmbeddingModel: 'text-embedding-ada-002',
      allowedProviders: ['openai', 'azure_openai', 'anthropic'],
      allowedModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet', 'claude-3-haiku'],
      globalRateLimits: {
        requestsPerMinute: 100,
        tokensPerMinute: 100000,
      },
      costControls: {
        maxTokensPerRequest: 8000,
        maxDailyCostPerTenant: 50,
        maxMonthlyCostPerTenant: 1000,
      },
      features: {
        allowTenantBYOK: true,
        allowTenantModelSelection: true,
        enableUsageTracking: true,
        enableCostAllocation: true,
      },
      modelSelection: DEFAULT_MODEL_SELECTION_CONFIG,
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  // ============================================
  // Tenant Configuration (Tenant Admin)
  // ============================================

  /**
   * Get tenant AI configuration
   */
  async getTenantConfig(tenantId: string): Promise<TenantAIConfig | null> {
    // Check cache
    const cached = await this.redis.get(`${CACHE_PREFIX}tenant:${tenantId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const { resource } = await this.tenantConfigContainer.item(tenantId, tenantId).read<TenantAIConfig>();
      
      if (resource) {
        await this.redis.setex(`${CACHE_PREFIX}tenant:${tenantId}`, CACHE_TTL, JSON.stringify(resource));
        return resource;
      }
    } catch (error: any) {
      if (error.code !== 404) {throw error;}
    }

    return null;
  }

  /**
   * Update tenant AI configuration (Tenant Admin)
   */
  async updateTenantConfig(
    tenantId: string,
    input: UpdateTenantAIConfigInput,
    updatedBy: string
  ): Promise<TenantAIConfig> {
    const systemConfig = await this.getSystemConfig();
    const current = await this.getTenantConfig(tenantId);

    // Validate model is allowed
    if (input.defaultModel && !systemConfig.allowedModels.includes(input.defaultModel)) {
      throw new Error(`Model ${input.defaultModel} is not allowed. Allowed models: ${systemConfig.allowedModels.join(', ')}`);
    }

    // Validate provider is allowed
    if (input.defaultProvider && !systemConfig.allowedProviders.includes(input.defaultProvider)) {
      throw new Error(`Provider ${input.defaultProvider} is not allowed. Allowed providers: ${systemConfig.allowedProviders.join(', ')}`);
    }

    const updated: TenantAIConfig = {
      id: tenantId,
      tenantId,
      defaultProvider: input.defaultProvider ?? current?.defaultProvider,
      defaultModel: input.defaultModel ?? current?.defaultModel,
      defaultEmbeddingModel: input.defaultEmbeddingModel ?? current?.defaultEmbeddingModel,
      tenantCredentials: current?.tenantCredentials || [],
      useSystemCredentials: input.useSystemCredentials ?? current?.useSystemCredentials ?? true,
      rateLimits: {
        ...current?.rateLimits,
        ...input.rateLimits,
      },
      usage: current?.usage || {
        currentMonthTokens: 0,
        currentMonthCost: 0,
        lastResetAt: new Date(),
      },
      createdAt: current?.createdAt || new Date(),
      updatedAt: new Date(),
      updatedBy,
    };

    await this.saveTenantConfig(updated);
    return updated;
  }

  /**
   * Add tenant's own AI credentials (BYOK)
   * Now stores API keys in Azure Key Vault instead of encrypting in Cosmos DB
   */
  async addTenantCredential(
    tenantId: string,
    input: AddTenantAICredentialInput,
    addedBy: string
  ): Promise<void> {
    const systemConfig = await this.getSystemConfig();

    // Check if BYOK is allowed
    if (!systemConfig.features.allowTenantBYOK) {
      throw new Error('Tenant BYOK is not enabled by system administrator');
    }

    // Validate provider is allowed
    if (!systemConfig.allowedProviders.includes(input.provider)) {
      throw new Error(`Provider ${input.provider} is not allowed`);
    }

    let config = await this.getTenantConfig(tenantId);
    if (!config) {
      config = await this.updateTenantConfig(tenantId, {}, addedBy);
    }

    // Store API key in Key Vault with tenant-specific secret name
    const keyVaultSecretName = await this.storeApiKeyInKeyVault(input.provider, input.apiKey, tenantId);
    
    const credentials = config.tenantCredentials || [];
    const existingIndex = credentials.findIndex(c => c.provider === input.provider);
    
    // Store the Key Vault secret name as reference instead of encrypted key
    const newCredential = {
      provider: input.provider,
      encryptedApiKey: keyVaultSecretName, // Now stores Key Vault secret name
      endpoint: input.endpoint,
      deploymentMappings: input.deploymentMappings,
      isActive: true,
      addedAt: new Date(),
      addedBy,
    };

    if (existingIndex >= 0) {
      credentials[existingIndex] = newCredential;
    } else {
      credentials.push(newCredential);
    }

    config.tenantCredentials = credentials;
    config.useSystemCredentials = false; // Switch to tenant credentials
    config.updatedAt = new Date();
    config.updatedBy = addedBy;

    await this.saveTenantConfig(config);
  }

  /**
   * Remove tenant's AI credentials
   */
  async removeTenantCredential(
    tenantId: string,
    provider: AIProviderName,
    removedBy: string
  ): Promise<void> {
    const config = await this.getTenantConfig(tenantId);
    if (!config) {return;}

    if (config.tenantCredentials) {
      config.tenantCredentials = config.tenantCredentials.filter(c => c.provider !== provider);
      
      // If no more tenant credentials, switch back to system
      if (config.tenantCredentials.length === 0) {
        config.useSystemCredentials = true;
      }
      
      config.updatedAt = new Date();
      config.updatedBy = removedBy;
      
      await this.saveTenantConfig(config);
    }
  }

  /**
   * Toggle tenant credential active status
   */
  async toggleTenantCredential(
    tenantId: string,
    provider: AIProviderName,
    isActive: boolean,
    updatedBy: string
  ): Promise<void> {
    const config = await this.getTenantConfig(tenantId);
    if (!config?.tenantCredentials) {return;}

    const credential = config.tenantCredentials.find(c => c.provider === provider);
    if (credential) {
      credential.isActive = isActive;
      config.updatedAt = new Date();
      config.updatedBy = updatedBy;
      await this.saveTenantConfig(config);
    }
  }

  private async saveTenantConfig(config: TenantAIConfig): Promise<void> {
    await this.tenantConfigContainer.items.upsert({
      ...config,
      partitionKey: config.tenantId,
    });
    await this.redis.setex(`${CACHE_PREFIX}tenant:${config.tenantId}`, CACHE_TTL, JSON.stringify(config));
  }

  // ============================================
  // Model Resolution (Hierarchy)
  // ============================================

  /**
   * Resolve the AI configuration for a request
   * Hierarchy:
   *   1. Assistant-specific model (if provided)
   *   2. Tenant default model
   *   3. System default model
   */
  async resolveAIConfig(
    tenantId: string,
    assistantModel?: string
  ): Promise<ResolvedAIConfig> {
    const systemConfig = await this.getSystemConfig();
    const tenantConfig = await this.getTenantConfig(tenantId);

    // Determine model
    let model = systemConfig.defaultModel;
    let embeddingModel = systemConfig.defaultEmbeddingModel;
    let selectionReason = 'System default';

    // Check tenant override
    if (tenantConfig?.defaultModel) {
      if (systemConfig.features.allowTenantModelSelection && 
          systemConfig.allowedModels.includes(tenantConfig.defaultModel)) {
        model = tenantConfig.defaultModel;
        selectionReason = 'Tenant default';
      }
    }

    if (tenantConfig?.defaultEmbeddingModel) {
      if (systemConfig.allowedModels.includes(tenantConfig.defaultEmbeddingModel)) {
        embeddingModel = tenantConfig.defaultEmbeddingModel;
      }
    }

    // Check assistant override
    if (assistantModel && systemConfig.allowedModels.includes(assistantModel)) {
      model = assistantModel;
      selectionReason = 'Assistant-specific';
    }

    // Determine provider from model
    const modelInfo = getModelById(model);
    const provider = modelInfo?.provider || tenantConfig?.defaultProvider || systemConfig.defaultProvider;

    // Determine credential source
    let credentialSource: 'system' | 'tenant' = 'system';
    if (tenantConfig && !tenantConfig.useSystemCredentials) {
      const hasTenantCredential = tenantConfig.tenantCredentials?.some(
        c => c.provider === provider && c.isActive
      );
      if (hasTenantCredential) {
        credentialSource = 'tenant';
      }
    }

    // Calculate rate limits (min of system and tenant)
    const rateLimits = {
      requestsPerMinute: Math.min(
        systemConfig.globalRateLimits.requestsPerMinute,
        tenantConfig?.rateLimits?.requestsPerMinute || Infinity
      ),
      tokensPerMinute: Math.min(
        systemConfig.globalRateLimits.tokensPerMinute,
        tenantConfig?.rateLimits?.tokensPerMinute || Infinity
      ),
    };

    // Calculate remaining budget
    const usage = tenantConfig?.usage || { currentMonthTokens: 0, currentMonthCost: 0 };
    
    // Get actual daily usage from Redis
    let dailyUsage = 0;
    if (this.redis && systemConfig.costControls.maxDailyCostPerTenant > 0) {
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `ai:usage:daily:${tenantId}:${today}`;
      const dailyData = await this.redis.hgetall(dailyKey);
      dailyUsage = parseFloat(dailyData.cost || '0');
    }
    
    const costLimits = {
      maxTokensPerRequest: systemConfig.costControls.maxTokensPerRequest,
      remainingDailyBudget: Math.max(0, systemConfig.costControls.maxDailyCostPerTenant - dailyUsage),
      remainingMonthlyBudget: systemConfig.costControls.maxMonthlyCostPerTenant - usage.currentMonthCost,
    };

    return {
      provider,
      model,
      embeddingModel,
      credentialSource,
      rateLimits,
      costLimits,
      selectionReason,
    };
  }

  /**
   * Get decrypted API key for a provider
   * Now retrieves from Azure Key Vault instead of decrypting from Cosmos DB
   */
  async getApiKey(
    tenantId: string,
    provider: AIProviderName
  ): Promise<{ apiKey: string; endpoint?: string; deploymentMappings?: Record<string, string> } | null> {
    const resolved = await this.resolveAIConfig(tenantId);

    if (resolved.credentialSource === 'tenant') {
      const tenantConfig = await this.getTenantConfig(tenantId);
      const credential = tenantConfig?.tenantCredentials?.find(
        c => c.provider === provider && c.isActive
      );
      if (credential) {
        // Check if this is a Key Vault reference (no colons = secret name)
        const apiKey = credential.encryptedApiKey.includes(':')
          ? this.decryptApiKey(credential.encryptedApiKey) // Legacy encrypted key
          : await this.retrieveApiKeyFromKeyVault(credential.encryptedApiKey); // Key Vault reference
        
        return {
          apiKey,
          endpoint: credential.endpoint,
          deploymentMappings: credential.deploymentMappings,
        };
      }
    }

    // Fall back to system credentials
    const systemConfig = await this.getSystemConfig();
    const credential = systemConfig.systemCredentials?.find(c => c.provider === provider);
    if (credential) {
      // Check if this is a Key Vault reference (no colons = secret name)
      const apiKey = credential.encryptedApiKey.includes(':')
        ? this.decryptApiKey(credential.encryptedApiKey) // Legacy encrypted key
        : await this.retrieveApiKeyFromKeyVault(credential.encryptedApiKey); // Key Vault reference
      
      return {
        apiKey,
        endpoint: credential.endpoint,
        deploymentMappings: credential.deploymentMappings,
      };
    }

    return null;
  }

  // ============================================
  // Usage Tracking
  // ============================================

  /**
   * Helper: Get tenant admin user IDs
   */
  private async getTenantAdminUserIds(tenantId: string): Promise<string[]> {
    if (!this.userService) {
      return [];
    }

    try {
      const result = await this.userService.listUsers(tenantId, {
        page: 1,
        limit: 1000, // Large limit to get all users
      });

      // Filter for admin users (roles include 'admin', 'owner', 'tenant_admin', 'super_admin')
      const adminUserIds = result.users
        .filter(user => {
          const roles = user.roles || [];
          return roles.some(role =>
            ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase())
          );
        })
        .map(user => user.id);

      return adminUserIds;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.get-tenant-admin-ids' });
      return [];
    }
  }

  /**
   * Helper: Send notification to tenant admins
   */
  private async notifyTenantAdmins(
    tenantId: string,
    notification: {
      name: string;
      content: string;
      link?: string;
      type: 'information' | 'warning' | 'error';
      priority?: 'low' | 'medium' | 'high';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.notificationService || !this.userService) {
      return;
    }

    try {
      const adminUserIds = await this.getTenantAdminUserIds(tenantId);
      
      if (adminUserIds.length === 0) {
        return; // No admins to notify
      }

      // Create notifications for each admin
      for (const userId of adminUserIds) {
        await this.notificationService.createSystemNotification({
          tenantId,
          userId,
          name: notification.name,
          content: notification.content,
          link: notification.link,
          type: notification.type,
          priority: notification.priority || (notification.type === 'error' ? 'high' : 'medium'),
          metadata: {
            source: 'ai_cost_tracking',
            ...notification.metadata,
          },
        });
      }
    } catch (error) {
      // Don't fail if notification fails
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.send-tenant-admin-notification' });
    }
  }

  /**
   * Check and send cost alerts if thresholds are exceeded
   */
  private async checkAndSendCostAlerts(tenantId: string): Promise<void> {
    if (!this.redis || !this.notificationService || !this.userService) {
      return;
    }

    try {
      const systemConfig = await this.getSystemConfig();
      const tenantConfig = await this.getTenantConfig(tenantId);
      
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `ai:usage:daily:${tenantId}:${today}`;
      const dailyData = await this.redis.hgetall(dailyKey);
      const dailyUsage = parseFloat(dailyData.cost || '0');
      
      const monthlyUsage = tenantConfig?.usage?.currentMonthCost || 0;
      const dailyLimit = systemConfig.costControls.maxDailyCostPerTenant;
      const monthlyLimit = tenantConfig?.usage?.monthlyBudget;

      // Check daily budget alerts
      if (dailyLimit > 0) {
        const dailyPercentUsed = (dailyUsage / dailyLimit) * 100;
        
        // Alert at 80% (warning)
        if (dailyPercentUsed >= 80 && dailyPercentUsed < 100) {
          const alertKey = `ai:cost:alert:daily:80:${tenantId}:${today}`;
          const alreadyAlerted = await this.redis.get(alertKey);
          
          if (!alreadyAlerted) {
            await this.notifyTenantAdmins(tenantId, {
              name: 'Daily AI Cost Budget Warning',
              content: `Your daily AI cost budget is ${dailyPercentUsed.toFixed(1)}% used ($${dailyUsage.toFixed(2)} / $${dailyLimit.toFixed(2)}). You have $${(dailyLimit - dailyUsage).toFixed(2)} remaining today.`,
              link: '/settings?tab=usage',
              type: 'warning',
              priority: 'medium',
              metadata: {
                budgetType: 'daily',
                usage: dailyUsage,
                limit: dailyLimit,
                percentUsed: dailyPercentUsed,
                threshold: 80,
              },
            });
            
            // Mark as alerted (expires at end of day)
            await this.redis.setex(alertKey, 24 * 60 * 60, '1');
          }
        }
        
        // Alert at 100% (error)
        if (dailyPercentUsed >= 100) {
          const alertKey = `ai:cost:alert:daily:100:${tenantId}:${today}`;
          const alreadyAlerted = await this.redis.get(alertKey);
          
          if (!alreadyAlerted) {
            await this.notifyTenantAdmins(tenantId, {
              name: 'Daily AI Cost Budget Exceeded',
              content: `Your daily AI cost budget has been exceeded ($${dailyUsage.toFixed(2)} / $${dailyLimit.toFixed(2)}). AI requests may be blocked until tomorrow.`,
              link: '/settings?tab=usage',
              type: 'error',
              priority: 'high',
              metadata: {
                budgetType: 'daily',
                usage: dailyUsage,
                limit: dailyLimit,
                percentUsed: dailyPercentUsed,
                threshold: 100,
              },
            });
            
            // Mark as alerted (expires at end of day)
            await this.redis.setex(alertKey, 24 * 60 * 60, '1');
          }
        }
      }

      // Check monthly budget alerts
      if (monthlyLimit && monthlyLimit > 0) {
        const monthlyPercentUsed = (monthlyUsage / monthlyLimit) * 100;
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        // Alert at 80% (warning)
        if (monthlyPercentUsed >= 80 && monthlyPercentUsed < 100) {
          const alertKey = `ai:cost:alert:monthly:80:${tenantId}:${currentMonth}`;
          const alreadyAlerted = await this.redis.get(alertKey);
          
          if (!alreadyAlerted) {
            await this.notifyTenantAdmins(tenantId, {
              name: 'Monthly AI Cost Budget Warning',
              content: `Your monthly AI cost budget is ${monthlyPercentUsed.toFixed(1)}% used ($${monthlyUsage.toFixed(2)} / $${monthlyLimit.toFixed(2)}). You have $${(monthlyLimit - monthlyUsage).toFixed(2)} remaining this month.`,
              link: '/settings?tab=usage',
              type: 'warning',
              priority: 'medium',
              metadata: {
                budgetType: 'monthly',
                usage: monthlyUsage,
                limit: monthlyLimit,
                percentUsed: monthlyPercentUsed,
                threshold: 80,
              },
            });
            
            // Mark as alerted (expires at end of month)
            const daysUntilMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
            await this.redis.setex(alertKey, daysUntilMonthEnd * 24 * 60 * 60, '1');
          }
        }
        
        // Alert at 100% (error)
        if (monthlyPercentUsed >= 100) {
          const alertKey = `ai:cost:alert:monthly:100:${tenantId}:${currentMonth}`;
          const alreadyAlerted = await this.redis.get(alertKey);
          
          if (!alreadyAlerted) {
            await this.notifyTenantAdmins(tenantId, {
              name: 'Monthly AI Cost Budget Exceeded',
              content: `Your monthly AI cost budget has been exceeded ($${monthlyUsage.toFixed(2)} / $${monthlyLimit.toFixed(2)}). AI requests may be blocked until next month.`,
              link: '/settings?tab=usage',
              type: 'error',
              priority: 'high',
              metadata: {
                budgetType: 'monthly',
                usage: monthlyUsage,
                limit: monthlyLimit,
                percentUsed: monthlyPercentUsed,
                threshold: 100,
              },
            });
            
            // Mark as alerted (expires at end of month)
            const daysUntilMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
            await this.redis.setex(alertKey, daysUntilMonthEnd * 24 * 60 * 60, '1');
          }
        }
      }
    } catch (error) {
      // Don't fail usage recording if alert checking fails
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.check-cost-alerts' });
    }
  }

  /**
   * Record AI usage for a tenant
   */
  async recordUsage(usage: Omit<AIUsageRecord, 'id'> & {
    insightType?: string;
    conversationId?: string;
    connectionId?: string;
  }): Promise<void> {
    const systemConfig = await this.getSystemConfig();
    if (!systemConfig.features.enableUsageTracking) {return;}

    const record: AIUsageRecord = {
      ...usage,
      id: crypto.randomUUID(),
      insightType: usage.insightType,
      conversationId: usage.conversationId,
      connectionId: usage.connectionId,
    };

    await this.usageContainer.items.create({
      ...record,
      partitionKey: usage.tenantId,
    });

    // Update tenant usage totals (monthly)
    const tenantConfig = await this.getTenantConfig(usage.tenantId);
    if (tenantConfig) {
      tenantConfig.usage.currentMonthTokens += usage.totalTokens;
      tenantConfig.usage.currentMonthCost += usage.estimatedCost;
      await this.saveTenantConfig(tenantConfig);
    }

    // Track daily costs in Redis
    if (this.redis) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyKey = `ai:usage:daily:${usage.tenantId}:${today}`;
      
      // Increment daily cost (using hincrbyfloat for precision)
      await this.redis.hincrbyfloat(dailyKey, 'cost', usage.estimatedCost);
      await this.redis.hincrby(dailyKey, 'tokens', usage.totalTokens);
      await this.redis.hincrby(dailyKey, 'requests', 1);
      
      // Set expiration to 2 days (to allow for timezone differences and late processing)
      await this.redis.expire(dailyKey, 2 * 24 * 60 * 60);
    }

    // Check and send cost alerts (non-blocking)
    this.checkAndSendCostAlerts(usage.tenantId).catch(error => {
      // Log but don't throw - alerts are non-critical
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.check-cost-alerts-async' });
    });
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    byModel: Record<string, { tokens: number; cost: number; count: number }>;
    byDay: Array<{ date: string; tokens: number; cost: number }>;
    byInsightType?: Record<string, { tokens: number; cost: number; count: number }>;
    byUser?: Record<string, { tokens: number; cost: number; count: number }>;
    byFeature?: Record<string, { tokens: number; cost: number; count: number }>;
  }> {
    const query = {
      query: `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.requestedAt >= @startDate 
        AND c.requestedAt <= @endDate
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@startDate', value: startDate.toISOString() },
        { name: '@endDate', value: endDate.toISOString() },
      ],
    };

    const { resources } = await this.usageContainer.items.query<AIUsageRecord>(query).fetchAll();

    const stats = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: resources.length,
      byModel: {} as Record<string, { tokens: number; cost: number; count: number }>,
      byDay: [] as Array<{ date: string; tokens: number; cost: number }>,
      byInsightType: {} as Record<string, { tokens: number; cost: number; count: number }>,
      byUser: {} as Record<string, { tokens: number; cost: number; count: number }>,
      byFeature: {} as Record<string, { tokens: number; cost: number; count: number }>,
    };

    const byDayMap = new Map<string, { tokens: number; cost: number }>();

    for (const record of resources) {
      stats.totalTokens += record.totalTokens;
      stats.totalCost += record.estimatedCost;

      // By model
      if (!stats.byModel[record.model]) {
        stats.byModel[record.model] = { tokens: 0, cost: 0, count: 0 };
      }
      stats.byModel[record.model].tokens += record.totalTokens;
      stats.byModel[record.model].cost += record.estimatedCost;
      stats.byModel[record.model].count++;

      // By insight type (if available)
      if (record.insightType) {
        if (!stats.byInsightType[record.insightType]) {
          stats.byInsightType[record.insightType] = { tokens: 0, cost: 0, count: 0 };
        }
        stats.byInsightType[record.insightType].tokens += record.totalTokens;
        stats.byInsightType[record.insightType].cost += record.estimatedCost;
        stats.byInsightType[record.insightType].count++;
      }

      // By user
      if (!stats.byUser[record.userId]) {
        stats.byUser[record.userId] = { tokens: 0, cost: 0, count: 0 };
      }
      stats.byUser[record.userId].tokens += record.totalTokens;
      stats.byUser[record.userId].cost += record.estimatedCost;
      stats.byUser[record.userId].count++;

      // By feature (high-level feature category)
      const feature = record.feature || this.inferFeatureFromOperation(record.operation, record.source);
      if (!stats.byFeature[feature]) {
        stats.byFeature[feature] = { tokens: 0, cost: 0, count: 0 };
      }
      stats.byFeature[feature].tokens += record.totalTokens;
      stats.byFeature[feature].cost += record.estimatedCost;
      stats.byFeature[feature].count++;

      // By day
      const day = record.requestedAt.toString().split('T')[0];
      const dayStats = byDayMap.get(day) || { tokens: 0, cost: 0 };
      dayStats.tokens += record.totalTokens;
      dayStats.cost += record.estimatedCost;
      byDayMap.set(day, dayStats);
    }

    stats.byDay = Array.from(byDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  /**
   * Infer feature category from operation and source
   */
  private inferFeatureFromOperation(
    operation: 'chat' | 'completion' | 'embedding' | 'other',
    source?: 'assistant' | 'enrichment' | 'search' | 'api'
  ): 'ai-insights' | 'chat' | 'embeddings' | 'web-search' | 'content-generation' | 'other' {
    if (operation === 'embedding') {
      return 'embeddings';
    }
    if (operation === 'chat') {
      return 'chat';
    }
    if (source === 'search') {
      return 'web-search';
    }
    if (source === 'enrichment' || operation === 'completion') {
      return 'ai-insights';
    }
    return 'other';
  }

  /**
   * Get comprehensive billing summary for a tenant
   */
  async getBillingSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    insightCount: number;
    byModel: Array<{ modelId: string; modelName: string; cost: number; tokens: number; requests: number }>;
    byInsightType: Array<{ insightType: string; cost: number; tokens: number; requests: number }>;
    byUser: Array<{ userId: string; cost: number; tokens: number; requests: number }>;
    byFeature: Array<{ feature: string; cost: number; tokens: number; requests: number }>;
    dailyBreakdown: Array<{ date: string; cost: number; tokens: number; requests: number }>;
    budget?: {
      limit: number;
      used: number;
      remaining: number;
      percentUsed: number;
    };
  }> {
    const stats = await this.getUsageStats(tenantId, startDate, endDate);
    const tenantConfig = await this.getTenantConfig(tenantId);

    // Get model names for better display
    const systemConfig = await this.getSystemConfig();
    const modelMap = new Map<string, string>();
    for (const providerDef of Object.values(AI_PROVIDERS)) {
      for (const model of providerDef.models) {
        modelMap.set(model.id, model.name);
      }
    }

    const byModel = Object.entries(stats.byModel).map(([modelId, data]) => ({
      modelId,
      modelName: modelMap.get(modelId) || modelId,
      cost: data.cost,
      tokens: data.tokens,
      requests: data.count,
    }));

    const byInsightType = Object.entries(stats.byInsightType || {}).map(([insightType, data]) => ({
      insightType,
      cost: data.cost,
      tokens: data.tokens,
      requests: data.count,
    }));

    const byUser = Object.entries(stats.byUser || {}).map(([userId, data]) => ({
      userId,
      cost: data.cost,
      tokens: data.tokens,
      requests: data.count,
    }));

    const byFeature = Object.entries(stats.byFeature || {}).map(([feature, data]) => ({
      feature,
      cost: data.cost,
      tokens: data.tokens,
      requests: data.count,
    }));

    const dailyBreakdown = stats.byDay.map(day => ({
      date: day.date,
      cost: day.cost,
      tokens: day.tokens,
      requests: 0, // We don't track request count per day in current implementation
    }));

    // Budget information (if configured)
    let budget: { 
      limit: number; 
      used: number; 
      remaining: number; 
      percentUsed: number;
      dailyLimit?: number;
      dailyUsed?: number;
      dailyRemaining?: number;
      dailyPercentUsed?: number;
    } | undefined;
    
    if (tenantConfig?.usage?.monthlyBudget) {
      const limit = tenantConfig.usage.monthlyBudget;
      const used = stats.totalCost;
      const remaining = Math.max(0, limit - used);
      const percentUsed = (used / limit) * 100;

      budget = {
        limit,
        used,
        remaining,
        percentUsed: Math.min(100, percentUsed),
      };

      // Add daily budget information if configured
      if (systemConfig.costControls.maxDailyCostPerTenant > 0) {
        const today = new Date().toISOString().split('T')[0];
        let dailyUsed = 0;
        
        if (this.redis) {
          const dailyKey = `ai:usage:daily:${tenantId}:${today}`;
          const dailyData = await this.redis.hgetall(dailyKey);
          dailyUsed = parseFloat(dailyData.cost || '0');
        }
        
        const dailyLimit = systemConfig.costControls.maxDailyCostPerTenant;
        const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
        const dailyPercentUsed = (dailyUsed / dailyLimit) * 100;

        budget.dailyLimit = dailyLimit;
        budget.dailyUsed = dailyUsed;
        budget.dailyRemaining = dailyRemaining;
        budget.dailyPercentUsed = Math.min(100, dailyPercentUsed);
      }
    }

      return {
        totalCost: stats.totalCost,
        totalTokens: stats.totalTokens,
        insightCount: stats.requestCount,
        byModel,
        byInsightType,
        byUser,
        byFeature,
        dailyBreakdown,
        budget,
      };
  }

  /**
   * Check if tenant has budget capacity for estimated cost
   * Checks both daily and monthly budgets
   */
  async checkBudget(tenantId: string, estimatedCost: number): Promise<{
    hasCapacity: boolean;
    currentUsage: number;
    budgetLimit?: number;
    remaining?: number;
    dailyUsage?: number;
    dailyLimit?: number;
    dailyRemaining?: number;
    blockedBy?: 'daily' | 'monthly';
  }> {
    const systemConfig = await this.getSystemConfig();
    const tenantConfig = await this.getTenantConfig(tenantId);
    
    // Check daily budget first
    let dailyUsage = 0;
    let dailyLimit: number | undefined;
    let dailyRemaining: number | undefined;
    let blockedByDaily = false;

    if (systemConfig.costControls.maxDailyCostPerTenant > 0) {
      dailyLimit = systemConfig.costControls.maxDailyCostPerTenant;
      
      if (this.redis) {
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `ai:usage:daily:${tenantId}:${today}`;
        const dailyData = await this.redis.hgetall(dailyKey);
        dailyUsage = parseFloat(dailyData.cost || '0');
      }
      
      dailyRemaining = Math.max(0, dailyLimit - dailyUsage);
      blockedByDaily = dailyRemaining < estimatedCost;
    }

    // Check monthly budget
    let monthlyUsage = 0;
    let monthlyLimit: number | undefined;
    let monthlyRemaining: number | undefined;
    let blockedByMonthly = false;

    if (tenantConfig?.usage?.monthlyBudget !== undefined) {
      monthlyLimit = tenantConfig.usage.monthlyBudget;
      monthlyUsage = tenantConfig.usage.currentMonthCost || 0;
      monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsage);
      blockedByMonthly = monthlyRemaining < estimatedCost;
    }

    // If no budgets configured, allow usage
    if (!dailyLimit && !monthlyLimit) {
      return {
        hasCapacity: true,
        currentUsage: monthlyUsage,
        dailyUsage,
      };
    }

    // Check if blocked by either budget
    const hasCapacity = !blockedByDaily && !blockedByMonthly;
    const blockedBy = blockedByDaily ? 'daily' : blockedByMonthly ? 'monthly' : undefined;

    return {
      hasCapacity,
      currentUsage: monthlyUsage,
      budgetLimit: monthlyLimit,
      remaining: monthlyRemaining,
      dailyUsage,
      dailyLimit,
      dailyRemaining,
      blockedBy,
    };
  }

  // ============================================
  // Available Models
  // ============================================

  /**
   * Get available models for a tenant
   */
  async getAvailableModels(tenantId: string): Promise<{
    chatModels: Array<{ id: string; name: string; provider: string }>;
    embeddingModels: Array<{ id: string; name: string; provider: string }>;
    currentChatModel: string;
    currentEmbeddingModel: string;
  }> {
    const systemConfig = await this.getSystemConfig();
    const tenantConfig = await this.getTenantConfig(tenantId);

    const allowedModels = new Set(systemConfig.allowedModels);
    
    const chatModels: Array<{ id: string; name: string; provider: string }> = [];
    const embeddingModels: Array<{ id: string; name: string; provider: string }> = [];

    for (const providerDef of Object.values(AI_PROVIDERS)) {
      for (const model of providerDef.models) {
        if (allowedModels.has(model.id) || allowedModels.size === 0) {
          const modelInfo = { id: model.id, name: model.name, provider: providerDef.displayName };
          
          if (model.types.includes('chat')) {
            chatModels.push(modelInfo);
          }
          if (model.types.includes('embedding')) {
            embeddingModels.push(modelInfo);
          }
        }
      }
    }

    return {
      chatModels,
      embeddingModels,
      currentChatModel: tenantConfig?.defaultModel || systemConfig.defaultModel,
      currentEmbeddingModel: tenantConfig?.defaultEmbeddingModel || systemConfig.defaultEmbeddingModel,
    };
  }

  /**
   * Get all available providers with their configuration status
   */
  async getAvailableProviders(tenantId: string): Promise<Array<{
    provider: AIProviderName;
    displayName: string;
    description: string;
    icon: string;
    color: string;
    isConfigured: boolean;
    credentialSource: 'system' | 'tenant' | 'none';
    isAllowed: boolean;
  }>> {
    const systemConfig = await this.getSystemConfig();
    const tenantConfig = await this.getTenantConfig(tenantId);

    return Object.values(AI_PROVIDERS).map(providerDef => {
      const hasSystemCredential = systemConfig.systemCredentials?.some(
        c => c.provider === providerDef.provider
      );
      const hasTenantCredential = tenantConfig?.tenantCredentials?.some(
        c => c.provider === providerDef.provider && c.isActive
      );

      let credentialSource: 'system' | 'tenant' | 'none' = 'none';
      if (hasTenantCredential) {
        credentialSource = 'tenant';
      } else if (hasSystemCredential) {
        credentialSource = 'system';
      }

      return {
        provider: providerDef.provider,
        displayName: providerDef.displayName,
        description: providerDef.description,
        icon: providerDef.icon,
        color: providerDef.color,
        isConfigured: credentialSource !== 'none',
        credentialSource,
        isAllowed: systemConfig.allowedProviders.includes(providerDef.provider),
      };
    });
  }

  // ============================================
  // Encryption Helpers (Deprecated - Use Key Vault)
  // ============================================

  /**
   * Generate a Key Vault secret name for an AI provider credential
   * Format: ai-provider-{provider}-{tenantId or 'system'}
   */
  private getProviderSecretName(provider: AIProviderName, tenantId?: string): string {
    const scope = tenantId || 'system';
    return `ai-provider-${provider}-${scope}`;
  }

  /**
   * Store API key in Azure Key Vault
   * Automatically stores the secret and returns the secret reference name
   */
  private async storeApiKeyInKeyVault(
    provider: AIProviderName,
    apiKey: string,
    tenantId?: string
  ): Promise<string> {
    const secretName = this.getProviderSecretName(provider, tenantId);
    
    try {
      // Store the secret in Key Vault
      const result = await this.keyVault.setSecret(secretName, apiKey, {
        contentType: 'application/x-api-key',
        tags: {
          provider,
          scope: tenantId || 'system',
          type: 'ai-provider-credential',
          createdAt: new Date().toISOString(),
        },
      });
      
      this.monitoring?.trackEvent('ai-config.api-key-stored', {
        secretName,
        version: result.version,
      });
      
      return secretName;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.store-api-key' });
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          throw new Error(
            `Key Vault is not configured. Please set AZURE_KEY_VAULT_URL and authentication credentials. ` +
            `See documentation: docs/guides/ai-key-vault-migration.md`
          );
        }
        if (error.message.includes('Forbidden') || error.message.includes('Permission')) {
          throw new Error(
            `Insufficient permissions to write to Key Vault. ` +
            `Please grant 'Secret Set' permission using: ` +
            `az keyvault set-policy --name <vault> --spn <client-id> --secret-permissions set get list`
          );
        }
      }
      
      throw new Error(`Failed to store API key in Key Vault for provider ${provider}: ${error}`);
    }
  }

  /**
   * Retrieve API key from Azure Key Vault
   */
  private async retrieveApiKeyFromKeyVault(secretReference: string): Promise<string> {
    try {
      const result = await this.keyVault.getSecret(secretReference, {
        required: true,
        bypassCache: false,
      });
      
      return result.value;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'ai-config.retrieve-api-key', secretReference });
      throw new Error(`Failed to retrieve API key from Key Vault: ${secretReference}`);
    }
  }

  /**
   * @deprecated Use Key Vault instead
   * Legacy encryption method for backward compatibility
   */
  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * @deprecated Use Key Vault instead
   * Legacy decryption method for backward compatibility
   */
  private decryptApiKey(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // ============================================
  // Container Initialization
  // ============================================

  async ensureContainers(): Promise<void> {
    const database = this.systemConfigContainer.database;

    // System config container (single document)
    await database.containers.createIfNotExists({
      id: 'systemConfig',
      partitionKey: { paths: ['/partitionKey'] },
    });

    // Tenant AI config container
    await database.containers.createIfNotExists({
      id: 'tenantAIConfig',
      partitionKey: { paths: ['/tenantId'] },
    });

    // AI usage container with TTL
    await database.containers.createIfNotExists({
      id: 'aiUsage',
      partitionKey: { paths: ['/tenantId'] },
      defaultTtl: 60 * 60 * 24 * 90, // 90 days
    });
  }
}











