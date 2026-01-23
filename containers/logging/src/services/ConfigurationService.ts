/**
 * Configuration Service
 * Manages organization-specific audit configuration
 */

import { PrismaClient } from '.prisma/logging-client';
import { OrganizationConfig, UpdateOrganizationConfigInput } from '../types';
import { getConfig } from '../config';
import { log } from '../utils/logger';

export class ConfigurationService {
  private prisma: PrismaClient;
  private cache: Map<string, { config: OrganizationConfig | null; cachedAt: number }> = new Map();
  private cacheTtlMs = 60000; // 1 minute cache TTL
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  
  /**
   * Get organization configuration (with caching)
   */
  async getOrganizationConfig(organizationId: string): Promise<OrganizationConfig | null> {
    // Check cache first
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.config;
    }
    
    try {
      // Try to get org-specific config
      let configRow = await this.prisma.audit_configurations.findFirst({
        where: { organizationId },
      });
      
      // Fall back to global config if no org-specific config
      if (!configRow) {
        configRow = await this.prisma.audit_configurations.findFirst({
          where: { organizationId: null },
        });
      }
      
      const config = configRow ? this.mapToConfig(configRow) : null;
      
      // Cache the result
      this.cache.set(organizationId, { config, cachedAt: Date.now() });
      
      return config;
    } catch (error) {
      log.error('Failed to get organization config', error, { organizationId });
      return null;
    }
  }
  
  /**
   * Get global default configuration
   */
  async getGlobalConfig(): Promise<OrganizationConfig | null> {
    try {
      const configRow = await this.prisma.audit_configurations.findFirst({
        where: { organizationId: null },
      });
      
      return configRow ? this.mapToConfig(configRow) : null;
    } catch (error) {
      log.error('Failed to get global config', error);
      return null;
    }
  }
  
  /**
   * Create or update organization configuration
   */
  async upsertOrganizationConfig(
    organizationId: string | undefined,
    input: UpdateOrganizationConfigInput
  ): Promise<OrganizationConfig> {
    const appConfig = getConfig();
    
    const data = {
      organizationId: organizationId ?? null,
      captureIpAddress: input.captureIpAddress ?? appConfig.defaults.capture.ip_address,
      captureUserAgent: input.captureUserAgent ?? appConfig.defaults.capture.user_agent,
      captureGeolocation: input.captureGeolocation ?? appConfig.defaults.capture.geolocation,
      redactSensitiveData: input.redactSensitiveData ?? appConfig.defaults.redaction.enabled,
      redactionPatterns: input.redactionPatterns ?? appConfig.defaults.redaction.patterns,
      hashChainEnabled: input.hashChainEnabled ?? appConfig.defaults.hash_chain.enabled,
      alertsEnabled: input.alertsEnabled ?? appConfig.defaults.alerts.enabled,
    };
    
    // Find existing config
    const existing = await this.prisma.audit_configurations.findFirst({
      where: { organizationId: organizationId ?? null },
    });
    
    let result;
    if (existing) {
      result = await this.prisma.audit_configurations.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await this.prisma.audit_configurations.create({
        data,
      });
    }
    
    // Invalidate cache
    if (organizationId) {
      this.cache.delete(organizationId);
    }
    
    log.info('Organization config updated', { organizationId });
    
    return this.mapToConfig(result);
  }
  
  /**
   * Delete organization configuration (falls back to global)
   */
  async deleteOrganizationConfig(organizationId: string): Promise<void> {
    await this.prisma.audit_configurations.delete({
      where: { organizationId },
    });
    
    // Invalidate cache
    this.cache.delete(organizationId);
    
    log.info('Organization config deleted', { organizationId });
  }
  
  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Map database row to OrganizationConfig
   */
  private mapToConfig(row: any): OrganizationConfig {
    return {
      id: row.id,
      organizationId: row.organizationId ?? undefined,
      captureIpAddress: row.captureIpAddress,
      captureUserAgent: row.captureUserAgent,
      captureGeolocation: row.captureGeolocation,
      redactSensitiveData: row.redactSensitiveData,
      redactionPatterns: row.redactionPatterns as string[],
      hashChainEnabled: row.hashChainEnabled,
      alertsEnabled: row.alertsEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
