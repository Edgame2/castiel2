/**
 * Integration Visibility Service
 * 
 * Filters integrations based on tenant tier, visibility rules,
 * whitelisting, and blocking settings.
 */

import type {
  IntegrationCatalogEntry,
  IntegrationVisibilityRule,
  TenantCatalogView,
} from '../types/integration.types.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';

interface TenantContext {
  tenantId: string;
  pricingTier?: 'free' | 'pro' | 'enterprise';
  superAdmin: boolean;
}

/**
 * Integration Visibility Service
 * Determines which integrations are visible/available for a tenant
 */
export class IntegrationVisibilityService {
  constructor(private catalogRepository: IntegrationCatalogRepository) {}

  /**
   * Get filtered integrations for a tenant
   * Applies visibility rules, pricing restrictions, whitelisting, etc.
   */
  async getTenantCatalogView(tenantContext: TenantContext): Promise<TenantCatalogView> {
    // Get all active catalog entries
    const result = await this.catalogRepository.listCatalogEntries({
      filter: {
        status: 'active',
        deprecated: false,
      },
    });

    const catalogEntries = result.entries;
    const visibilityRules: Record<string, IntegrationVisibilityRule> = {};
    const availableIntegrations: IntegrationCatalogEntry[] = [];
    const unavailableIntegrations: Array<{
      integrationId: string;
      name: string;
      reason: 'requires_plan' | 'requires_approval' | 'blocked' | 'superadmin_only';
      requiredPlan?: string;
    }> = [];

    // Check each integration
    for (const entry of catalogEntries) {
      // Super admin only integrations
      if (entry.visibility === 'superadmin_only' && !tenantContext.superAdmin) {
        unavailableIntegrations.push({
          integrationId: entry.integrationId,
          name: entry.displayName,
          reason: 'superadmin_only',
        });
        continue;
      }

      // Check if tenant is blocked
      if (entry.blockedTenants?.includes(tenantContext.tenantId)) {
        unavailableIntegrations.push({
          integrationId: entry.integrationId,
          name: entry.displayName,
          reason: 'blocked',
        });
        continue;
      }

      // Check whitelist
      if (entry.allowedTenants !== null && entry.allowedTenants && entry.allowedTenants.length > 0) {
        if (!entry.allowedTenants.includes(tenantContext.tenantId)) {
          unavailableIntegrations.push({
            integrationId: entry.integrationId,
            name: entry.displayName,
            reason: 'blocked',
          });
          continue;
        }
      }

      // Check pricing tier requirement
      if (entry.requiredPlan && tenantContext.pricingTier) {
        const tierLevel = this.getTierLevel(tenantContext.pricingTier);
        const requiredLevel = this.getTierLevel(entry.requiredPlan as any);

        if (tierLevel < requiredLevel) {
          unavailableIntegrations.push({
            integrationId: entry.integrationId,
            name: entry.displayName,
            reason: 'requires_plan',
            requiredPlan: entry.requiredPlan,
          });
          continue;
        }
      }

      // Get visibility rule for this tenant/integration
      const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
        tenantContext.tenantId,
        entry.integrationId
      );

      // If visibility rule exists, respect it
      if (visibilityRule) {
        visibilityRules[entry.integrationId] = visibilityRule;

        // Check if hidden by visibility rule
        if (!visibilityRule.isVisible) {
          unavailableIntegrations.push({
            integrationId: entry.integrationId,
            name: entry.displayName,
            reason: 'blocked',
          });
          continue;
        }

        // Check if approval is required and not approved
        if (visibilityRule.requiresApproval && !visibilityRule.isApproved) {
          unavailableIntegrations.push({
            integrationId: entry.integrationId,
            name: entry.displayName,
            reason: 'requires_approval',
          });
          continue;
        }
      } else {
        // No visibility rule - create default one
        const defaultRule = await this.catalogRepository.createVisibilityRule({
          tenantId: tenantContext.tenantId,
          integrationId: entry.integrationId,
          isVisible: true,
          isEnabled: true,
          isApproved: !entry.requiresApproval,
          availableInPlan: tenantContext.pricingTier,
        });
        visibilityRules[entry.integrationId] = defaultRule;
      }

      availableIntegrations.push(entry);
    }

    return {
      integrations: availableIntegrations,
      visibility: visibilityRules,
      unavailableIntegrations,
      total: availableIntegrations.length,
      hasMore: false,
    };
  }

  /**
   * Check if integration is available for tenant
   */
  async isIntegrationAvailable(
    tenantContext: TenantContext,
    integrationId: string
  ): Promise<{
    available: boolean;
    reason?: 'requires_plan' | 'requires_approval' | 'blocked' | 'superadmin_only';
    message?: string;
  }> {
    const entry = await this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);

    if (!entry) {
      return {
        available: false,
        reason: 'blocked',
        message: 'Integration not found in catalog',
      };
    }

    // Super admin only
    if (entry.visibility === 'superadmin_only' && !tenantContext.superAdmin) {
      return {
        available: false,
        reason: 'superadmin_only',
        message: 'This integration is only available to super admins',
      };
    }

    // Blocked tenants
    if (entry.blockedTenants?.includes(tenantContext.tenantId)) {
      return {
        available: false,
        reason: 'blocked',
        message: 'This integration is not available for your account',
      };
    }

    // Whitelist check
    if (entry.allowedTenants !== null && entry.allowedTenants && entry.allowedTenants.length > 0) {
      if (!entry.allowedTenants.includes(tenantContext.tenantId)) {
        return {
          available: false,
          reason: 'blocked',
          message: 'This integration is not available for your account',
        };
      }
    }

    // Pricing tier check
    if (entry.requiredPlan && tenantContext.pricingTier) {
      const tierLevel = this.getTierLevel(tenantContext.pricingTier);
      const requiredLevel = this.getTierLevel(entry.requiredPlan as any);

      if (tierLevel < requiredLevel) {
        return {
          available: false,
          reason: 'requires_plan',
          message: `This integration requires ${entry.requiredPlan} plan or higher`,
        };
      }
    }

    // Visibility rule check
    const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
      tenantContext.tenantId,
      integrationId
    );

    if (visibilityRule) {
      if (!visibilityRule.isVisible) {
        return {
          available: false,
          reason: 'blocked',
          message: 'This integration is currently not available',
        };
      }

      if (visibilityRule.requiresApproval && !visibilityRule.isApproved) {
        return {
          available: false,
          reason: 'requires_approval',
          message: 'This integration requires approval from your admin',
        };
      }
    }

    return { available: true };
  }

  /**
   * Get integration with applied visibility rules for tenant
   */
  async getIntegrationForTenant(
    tenantContext: TenantContext,
    integrationId: string
  ): Promise<(IntegrationCatalogEntry & { visibilityRule?: IntegrationVisibilityRule }) | null> {
    const available = await this.isIntegrationAvailable(tenantContext, integrationId);
    if (!available.available) {
      return null;
    }

    const entry = await this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
    if (!entry) {
      return null;
    }

    const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
      tenantContext.tenantId,
      integrationId
    );

    return {
      ...entry,
      ...(visibilityRule && { visibilityRule }),
    };
  }

  /**
   * Get effective rate limit for tenant/integration
   * Considers both catalog defaults and custom tenant overrides
   */
  async getEffectiveRateLimit(
    tenantContext: TenantContext,
    integrationId: string
  ): Promise<{ requestsPerMinute: number; requestsPerHour: number } | null> {
    const entry = await this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
    if (!entry) {return null;}

    const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
      tenantContext.tenantId,
      integrationId
    );

    // Start with catalog defaults
    let rateLimit = { ...entry.rateLimit };

    // Override with custom rules if present
    if (visibilityRule?.customRateLimit) {
      rateLimit = {
        ...rateLimit,
        ...visibilityRule.customRateLimit,
      };
    }

    return rateLimit;
  }

  /**
   * Get effective capabilities for tenant/integration
   * Considers both catalog and custom tenant overrides
   */
  async getEffectiveCapabilities(
    tenantContext: TenantContext,
    integrationId: string
  ): Promise<string[] | null> {
    const entry = await this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
    if (!entry) {return null;}

    const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
      tenantContext.tenantId,
      integrationId
    );

    // Start with catalog defaults
    let capabilities = [...entry.capabilities];

    // Override with custom rules if present
    if (visibilityRule?.customCapabilities) {
      // Custom capabilities are a subset, filter to only allowed
      capabilities = capabilities.filter((c) => visibilityRule.customCapabilities!.includes(c as any));
    }

    return capabilities;
  }

  /**
   * Get effective sync directions for tenant/integration
   */
  async getEffectiveSyncDirections(
    tenantContext: TenantContext,
    integrationId: string
  ): Promise<('pull' | 'push' | 'bidirectional')[] | null> {
    const entry = await this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
    if (!entry) {return null;}

    const visibilityRule = await this.catalogRepository.getVisibilityRuleByTenantAndIntegration(
      tenantContext.tenantId,
      integrationId
    );

    // Start with catalog defaults
    let directions = [...entry.supportedSyncDirections];

    // Override with custom rules if present
    if (visibilityRule?.customSyncDirections) {
      // Custom directions are a subset, filter to only allowed
      directions = directions.filter((d) => visibilityRule.customSyncDirections!.includes(d));
    }

    return directions;
  }

  /**
   * Convert pricing tier to numeric level for comparison
   */
  private getTierLevel(tier: 'free' | 'pro' | 'enterprise' | 'premium'): number {
    const levels: Record<string, number> = {
      free: 0,
      pro: 1,
      enterprise: 2,
      premium: 3,
    };
    return levels[tier] ?? 0;
  }
}
