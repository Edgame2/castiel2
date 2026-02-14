/**
 * Configuration Service
 * Manages organization-specific audit configuration (Cosmos DB only).
 */

import { OrganizationConfig, UpdateOrganizationConfigInput } from '../types';
import { getConfig } from '../config';
import { log } from '../utils/logger';
import type { CosmosConfigurationRepository } from '../data/cosmos/configuration';

export class ConfigurationService {
  private cosmosConfig: CosmosConfigurationRepository;
  private cache: Map<string, { config: OrganizationConfig | null; cachedAt: number }> = new Map();
  private cacheTtlMs = 60000;

  constructor(cosmosConfig: CosmosConfigurationRepository) {
    this.cosmosConfig = cosmosConfig;
  }
  
  /**
   * Get organization configuration (with caching)
   */
  async getOrganizationConfig(tenantId: string): Promise<OrganizationConfig | null> {
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.config;
    }
    try {
      let config = await this.cosmosConfig.findFirst({ where: { tenantId } });
      if (!config) {
        config = await this.cosmosConfig.findFirst({ where: { tenantId: null } });
      }
      this.cache.set(tenantId, { config, cachedAt: Date.now() });
      
      return config;
    } catch (error) {
      log.error('Failed to get organization config', error, { tenantId });
      return null;
    }
  }
  
  /**
   * Get global default configuration
   */
  async getGlobalConfig(): Promise<OrganizationConfig | null> {
    try {
      return await this.cosmosConfig.findFirst({ where: { tenantId: null } });
    } catch (error) {
      log.error('Failed to get global config', error);
      return null;
    }
  }
  
  /**
   * Create or update organization configuration
   */
  async upsertOrganizationConfig(
    tenantId: string | undefined,
    input: UpdateOrganizationConfigInput
  ): Promise<OrganizationConfig> {
    const appConfig = getConfig();
    
    const data = {
      tenantId: tenantId ?? null,
      captureIpAddress: input.captureIpAddress ?? appConfig.defaults.capture.ip_address,
      captureUserAgent: input.captureUserAgent ?? appConfig.defaults.capture.user_agent,
      captureGeolocation: input.captureGeolocation ?? appConfig.defaults.capture.geolocation,
      redactSensitiveData: input.redactSensitiveData ?? appConfig.defaults.redaction.enabled,
      redactionPatterns: input.redactionPatterns ?? appConfig.defaults.redaction.patterns,
      hashChainEnabled: input.hashChainEnabled ?? appConfig.defaults.hash_chain.enabled,
      alertsEnabled: input.alertsEnabled ?? appConfig.defaults.alerts.enabled,
    };
    
    const result = await this.cosmosConfig.upsert(tenantId, data);
    if (tenantId) this.cache.delete(tenantId);
    log.info('Organization config updated', { tenantId });
    return result;
  }
  
  /**
   * Delete organization configuration (falls back to global)
   */
  async deleteOrganizationConfig(tenantId: string): Promise<void> {
    await this.cosmosConfig.delete({ where: { tenantId } });
    this.cache.delete(tenantId);
    log.info('Organization config deleted', { tenantId });
  }
  
  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.cache.clear();
  }
}
