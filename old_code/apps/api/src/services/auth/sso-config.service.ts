import { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import {
  SSOConfiguration,
  CreateSSOConfigRequest,
  UpdateSSOConfigRequest,
  SSOConfigStatus,
} from '../../types/sso.types.js';

/**
 * SSO Configuration Service
 * Manages organization SSO configurations in Cosmos DB with Redis caching
 */
export class SSOConfigService {
  private readonly CACHE_PREFIX = 'sso:config:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly container: Container,
    private readonly redis: Redis
  ) {}

  /**
   * Create SSO configuration for an organization
   */
  async createConfig(
    data: CreateSSOConfigRequest,
    createdBy: string
  ): Promise<SSOConfiguration> {
    const config: SSOConfiguration = {
      id: `org-${data.orgId}-sso`,
      orgId: data.orgId,
      orgName: data.orgName,
      provider: data.provider,
      status: SSOConfigStatus.PENDING,
      samlConfig: data.samlConfig,
      jitProvisioning: {
        enabled: data.jitProvisioning?.enabled ?? true,
        autoActivate: data.jitProvisioning?.autoActivate ?? true,
        defaultRole: data.jitProvisioning?.defaultRole,
        allowedDomains: data.jitProvisioning?.allowedDomains,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      partitionKey: data.orgId,
    };

    await this.container.items.create(config);

    // Cache the config
    await this.cacheConfig(config);

    return config;
  }

  /**
   * Get SSO configuration by organization ID
   */
  async getConfigByOrgId(orgId: string): Promise<SSOConfiguration | null> {
    // Try cache first
    const cached = await this.getCachedConfig(orgId);
    if (cached) {
      return cached;
    }

    // Query from Cosmos DB
    const { resources } = await this.container.items
      .query({
        query: 'SELECT * FROM c WHERE c.orgId = @orgId',
        parameters: [{ name: '@orgId', value: orgId }],
      })
      .fetchAll();

    if (resources.length === 0) {
      return null;
    }

    const config = resources[0] as SSOConfiguration;

    // Cache for future requests
    await this.cacheConfig(config);

    return config;
  }

  /**
   * Get SSO configuration by ID
   */
  async getConfigById(id: string, orgId: string): Promise<SSOConfiguration | null> {
    try {
      const { resource } = await this.container.item(id, orgId).read();
      
      if (!resource) {
        return null;
      }

      return resource as SSOConfiguration;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update SSO configuration
   */
  async updateConfig(
    orgId: string,
    updates: UpdateSSOConfigRequest
  ): Promise<SSOConfiguration | null> {
    const config = await this.getConfigByOrgId(orgId);
    
    if (!config) {
      return null;
    }

    const updatedConfig: SSOConfiguration = {
      ...config,
      ...updates,
      samlConfig: updates.samlConfig
        ? { ...config.samlConfig, ...updates.samlConfig }
        : config.samlConfig,
      jitProvisioning: updates.jitProvisioning
        ? { ...config.jitProvisioning, ...updates.jitProvisioning }
        : config.jitProvisioning,
      updatedAt: new Date(),
    };

    await this.container.item(config.id, config.orgId).replace(updatedConfig);

    // Invalidate cache
    await this.invalidateCache(orgId);

    // Cache updated config
    await this.cacheConfig(updatedConfig);

    return updatedConfig;
  }

  /**
   * Delete SSO configuration
   */
  async deleteConfig(orgId: string): Promise<boolean> {
    const config = await this.getConfigByOrgId(orgId);
    
    if (!config) {
      return false;
    }

    await this.container.item(config.id, config.orgId).delete();

    // Invalidate cache
    await this.invalidateCache(orgId);

    return true;
  }

  /**
   * Activate SSO configuration
   */
  async activateConfig(orgId: string): Promise<SSOConfiguration | null> {
    return this.updateConfig(orgId, { status: SSOConfigStatus.ACTIVE });
  }

  /**
   * Deactivate SSO configuration
   */
  async deactivateConfig(orgId: string): Promise<SSOConfiguration | null> {
    return this.updateConfig(orgId, { status: SSOConfigStatus.INACTIVE });
  }

  /**
   * List all SSO configurations (admin only)
   */
  async listConfigs(limit: number = 100): Promise<SSOConfiguration[]> {
    const { resources } = await this.container.items
      .query({
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit',
        parameters: [{ name: '@limit', value: limit }],
      })
      .fetchAll();

    return resources as SSOConfiguration[];
  }

  /**
   * Cache SSO configuration in Redis
   */
  private async cacheConfig(config: SSOConfiguration): Promise<void> {
    const key = `${this.CACHE_PREFIX}${config.orgId}`;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(config));
  }

  /**
   * Get cached SSO configuration
   */
  private async getCachedConfig(orgId: string): Promise<SSOConfiguration | null> {
    const key = `${this.CACHE_PREFIX}${orgId}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as SSOConfiguration;
    } catch {
      // Invalid JSON, invalidate cache
      await this.redis.del(key);
      return null;
    }
  }

  /**
   * Invalidate cached SSO configuration
   */
  private async invalidateCache(orgId: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${orgId}`;
    await this.redis.del(key);
  }

  /**
   * Validate SSO configuration
   */
  validateConfig(config: SSOConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required SAML fields
    if (!config.samlConfig.entryPoint) {
      errors.push('SAML entry point is required');
    }

    if (!config.samlConfig.issuer) {
      errors.push('SAML issuer is required');
    }

    if (!config.samlConfig.idpCert) {
      errors.push('IdP certificate is required');
    }

    if (!config.samlConfig.callbackUrl) {
      errors.push('Callback URL is required');
    }

    if (!config.samlConfig.entityId) {
      errors.push('Entity ID is required');
    }

    // Validate attribute mapping
    if (!config.samlConfig.attributeMapping.email) {
      errors.push('Email attribute mapping is required');
    }

    // Validate JIT provisioning
    if (config.jitProvisioning.enabled && config.jitProvisioning.allowedDomains) {
      if (config.jitProvisioning.allowedDomains.length === 0) {
        errors.push('At least one allowed domain is required when domain restriction is enabled');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
