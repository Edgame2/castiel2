import { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { SSOConfiguration, CreateSSOConfigRequest, UpdateSSOConfigRequest } from '../../types/sso.types.js';
/**
 * SSO Configuration Service
 * Manages organization SSO configurations in Cosmos DB with Redis caching
 */
export declare class SSOConfigService {
    private readonly container;
    private readonly redis;
    private readonly CACHE_PREFIX;
    private readonly CACHE_TTL;
    constructor(container: Container, redis: Redis);
    /**
     * Create SSO configuration for an organization
     */
    createConfig(data: CreateSSOConfigRequest, createdBy: string): Promise<SSOConfiguration>;
    /**
     * Get SSO configuration by organization ID
     */
    getConfigByOrgId(orgId: string): Promise<SSOConfiguration | null>;
    /**
     * Get SSO configuration by ID
     */
    getConfigById(id: string, orgId: string): Promise<SSOConfiguration | null>;
    /**
     * Update SSO configuration
     */
    updateConfig(orgId: string, updates: UpdateSSOConfigRequest): Promise<SSOConfiguration | null>;
    /**
     * Delete SSO configuration
     */
    deleteConfig(orgId: string): Promise<boolean>;
    /**
     * Activate SSO configuration
     */
    activateConfig(orgId: string): Promise<SSOConfiguration | null>;
    /**
     * Deactivate SSO configuration
     */
    deactivateConfig(orgId: string): Promise<SSOConfiguration | null>;
    /**
     * List all SSO configurations (admin only)
     */
    listConfigs(limit?: number): Promise<SSOConfiguration[]>;
    /**
     * Cache SSO configuration in Redis
     */
    private cacheConfig;
    /**
     * Get cached SSO configuration
     */
    private getCachedConfig;
    /**
     * Invalidate cached SSO configuration
     */
    private invalidateCache;
    /**
     * Validate SSO configuration
     */
    validateConfig(config: SSOConfiguration): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=sso-config.service.d.ts.map