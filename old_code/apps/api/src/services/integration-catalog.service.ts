/**
 * Integration Catalog Service
 * 
 * Business logic for managing the integration catalog
 */

import {
  IntegrationCatalogEntry,
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CatalogListOptions,
  CatalogListResult,
  IntegrationVisibilityRule,
  CreateVisibilityRuleInput,
  UpdateVisibilityRuleInput,
  EntityToShardTypeMapping,
} from '../types/integration.types.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';

/**
 * Integration Catalog Service
 * Manages catalog operations for super admins
 */
export class IntegrationCatalogService {
  constructor(private catalogRepository: IntegrationCatalogRepository) {}

  // ============================================
  // Catalog Entry Management
  // ============================================

  /**
   * Create new integration in catalog
   */
  async createIntegration(
    input: CreateIntegrationCatalogInput
  ): Promise<IntegrationCatalogEntry> {
    // Validate shard mappings
    this.validateShardMappings(input.shardMappings);

    return this.catalogRepository.createCatalogEntry(input);
  }

  /**
   * Get integration details
   */
  async getIntegration(integrationId: string): Promise<IntegrationCatalogEntry | null> {
    return this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
  }

  /**
   * List all integrations in catalog
   */
  async listIntegrations(options?: CatalogListOptions): Promise<CatalogListResult> {
    return this.catalogRepository.listCatalogEntries(options);
  }

  /**
   * Update integration in catalog
   */
  async updateIntegration(
    integrationId: string,
    input: UpdateIntegrationCatalogInput
  ): Promise<IntegrationCatalogEntry | null> {
    const existing = await this.getIntegration(integrationId);
    if (!existing) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate shard mappings if provided
    if (input.shardMappings) {
      this.validateShardMappings(input.shardMappings);
    }

    return this.catalogRepository.updateCatalogEntry(existing.id, existing.category, input);
  }

  /**
   * Delete integration from catalog
   */
  async deleteIntegration(integrationId: string): Promise<boolean> {
    const existing = await this.getIntegration(integrationId);
    if (!existing) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    return this.catalogRepository.deleteCatalogEntry(existing.id, existing.category);
  }

  /**
   * Deprecate integration (soft delete)
   * Marks as deprecated so existing connections continue working but no new ones can be created
   */
  async deprecateIntegration(
    integrationId: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    const existing = await this.getIntegration(integrationId);
    if (!existing) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    return this.catalogRepository.deprecateCatalogEntry(existing.id, existing.category, updatedBy);
  }

  /**
   * Get integrations by category
   */
  async getIntegrationsByCategory(category: string): Promise<IntegrationCatalogEntry[]> {
    return this.catalogRepository.getCatalogEntriesByCategory(category);
  }

  /**
   * Get premium integrations
   */
  async getPremiumIntegrations(): Promise<IntegrationCatalogEntry[]> {
    const { entries } = await this.catalogRepository.listCatalogEntries({
      filter: { requiredPlan: 'enterprise' },
    });
    return entries;
  }

  /**
   * Update integration's shard type mappings
   * Critical for defining which shard types this integration can sync to
   */
  async updateShardMappings(
    integrationId: string,
    mappings: EntityToShardTypeMapping[],
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    // Validate mappings
    this.validateShardMappings(mappings);

    return this.updateIntegration(integrationId, {
      shardMappings: mappings,
      updatedBy,
    });
  }

  /**
   * Validate shard type mappings
   */
  private validateShardMappings(mappings: EntityToShardTypeMapping[]): void {
    for (const mapping of mappings) {
      // Each mapping must have at least one supported shard type
      if (!mapping.supportedShardTypes || mapping.supportedShardTypes.length === 0) {
        throw new Error(
          `Invalid mapping for entity ${mapping.integrationEntity}: must have at least one supported shard type`
        );
      }

      // Default shard type must be in supported list
      if (!mapping.supportedShardTypes.includes(mapping.defaultShardType)) {
        throw new Error(
          `Invalid mapping for entity ${mapping.integrationEntity}: default shard type ${mapping.defaultShardType} not in supported types`
        );
      }
    }
  }

  // ============================================
  // Visibility & Access Control
  // ============================================

  /**
   * Create visibility rule for tenant
   */
  async createVisibilityRule(
    input: CreateVisibilityRuleInput
  ): Promise<IntegrationVisibilityRule> {
    // Verify integration exists
    const integration = await this.getIntegration(input.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${input.integrationId}`);
    }

    return this.catalogRepository.createVisibilityRule(input);
  }

  /**
   * Get visibility rule
   */
  async getVisibilityRule(
    tenantId: string,
    integrationId: string
  ): Promise<IntegrationVisibilityRule | null> {
    return this.catalogRepository.getVisibilityRuleByTenantAndIntegration(tenantId, integrationId);
  }

  /**
   * Update visibility rule
   */
  async updateVisibilityRule(
    id: string,
    tenantId: string,
    input: UpdateVisibilityRuleInput
  ): Promise<IntegrationVisibilityRule | null> {
    return this.catalogRepository.updateVisibilityRule(id, tenantId, input);
  }

  /**
   * Approve integration for tenant
   */
  async approveIntegration(
    tenantId: string,
    integrationId: string,
    approvedBy: string
  ): Promise<IntegrationVisibilityRule | null> {
    let rule = await this.getVisibilityRule(tenantId, integrationId);

    if (!rule) {
      // Create rule if doesn't exist
      rule = await this.createVisibilityRule({
        tenantId,
        integrationId,
        isApproved: true,
        requestedBy: approvedBy, // Use requestedBy field since approvedBy is not in CreateVisibilityRuleInput
      });
      // After creation, update with approvedBy via approveIntegrationForTenant
      if (rule) {
        return this.catalogRepository.approveIntegrationForTenant(rule.id, tenantId, approvedBy);
      }
      return rule;
    }

    return this.catalogRepository.approveIntegrationForTenant(rule.id, tenantId, approvedBy);
  }

  /**
   * Deny integration for tenant
   */
  async denyIntegration(
    tenantId: string,
    integrationId: string,
    denialReason: string,
    approvedBy: string
  ): Promise<IntegrationVisibilityRule | null> {
    let rule = await this.getVisibilityRule(tenantId, integrationId);

    if (!rule) {
      // Create rule if doesn't exist
      rule = await this.createVisibilityRule({
        tenantId,
        integrationId,
        isApproved: false,
      });
    }

    return this.catalogRepository.denyIntegrationForTenant(rule.id, tenantId, denialReason, approvedBy);
  }

  /**
   * Hide integration from tenant
   */
  async hideIntegrationFromTenant(
    tenantId: string,
    integrationId: string,
    reason?: string
  ): Promise<IntegrationVisibilityRule | null> {
    let rule = await this.getVisibilityRule(tenantId, integrationId);

    if (!rule) {
      rule = await this.createVisibilityRule({
        tenantId,
        integrationId,
        isVisible: false,
        notes: reason,
      });
      return rule;
    }

    return this.catalogRepository.updateVisibilityRule(rule.id, tenantId, {
      isVisible: false,
      notes: reason,
    });
  }

  /**
   * Show integration to tenant
   */
  async showIntegrationToTenant(
    tenantId: string,
    integrationId: string
  ): Promise<IntegrationVisibilityRule | null> {
    let rule = await this.getVisibilityRule(tenantId, integrationId);

    if (!rule) {
      rule = await this.createVisibilityRule({
        tenantId,
        integrationId,
        isVisible: true,
      });
      return rule;
    }

    return this.catalogRepository.updateVisibilityRule(rule.id, tenantId, {
      isVisible: true,
    });
  }

  /**
   * Restrict integration capabilities for tenant
   */
  async restrictCapabilitiesForTenant(
    tenantId: string,
    integrationId: string,
    allowedCapabilities: string[],
    restrictedBy: string
  ): Promise<IntegrationVisibilityRule | null> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate that requested capabilities are available
    const invalidCapabilities = allowedCapabilities.filter(
      (cap) => !integration.capabilities.includes(cap as any)
    );
    if (invalidCapabilities.length > 0) {
      throw new Error(
        `Invalid capabilities: ${invalidCapabilities.join(', ')} not available for this integration`
      );
    }

    let rule = await this.getVisibilityRule(tenantId, integrationId);

    if (!rule) {
      rule = await this.createVisibilityRule({
        tenantId,
        integrationId,
        customCapabilities: allowedCapabilities as any,
      });
      return rule;
    }

    return this.catalogRepository.updateVisibilityRule(rule.id, tenantId, {
      customCapabilities: allowedCapabilities as any,
    });
  }

  /**
   * Get visibility rules for integration (across all tenants)
   */
  async getVisibilityRulesForIntegration(integrationId: string): Promise<IntegrationVisibilityRule[]> {
    return this.catalogRepository.listVisibilityRulesForIntegration(integrationId);
  }

  /**
   * Get visibility rules for tenant (across all integrations)
   */
  async getVisibilityRulesForTenant(tenantId: string): Promise<IntegrationVisibilityRule[]> {
    return this.catalogRepository.listVisibilityRulesForTenant(tenantId);
  }

  // ============================================
  // Whitelist & Blocking Management
  // ============================================

  /**
   * Add tenant to whitelist for integration
   */
  async addTenantToWhitelist(
    integrationId: string,
    tenantId: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // If allowedTenants is null (public), convert to array with this tenant
    let allowedTenants = integration.allowedTenants || [];
    if (!allowedTenants.includes(tenantId)) {
      allowedTenants = [...allowedTenants, tenantId];
    }

    return this.updateIntegration(integrationId, {
      allowedTenants,
      updatedBy,
    });
  }

  /**
   * Remove tenant from whitelist
   */
  async removeTenantFromWhitelist(
    integrationId: string,
    tenantId: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const allowedTenants = (integration.allowedTenants || []).filter((id) => id !== tenantId);

    return this.updateIntegration(integrationId, {
      allowedTenants: allowedTenants.length > 0 ? allowedTenants : null,
      updatedBy,
    });
  }

  /**
   * Block tenant from using integration
   */
  async blockTenant(
    integrationId: string,
    tenantId: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const blockedTenants = integration.blockedTenants || [];
    if (!blockedTenants.includes(tenantId)) {
      blockedTenants.push(tenantId);
    }

    return this.updateIntegration(integrationId, {
      blockedTenants,
      updatedBy,
    });
  }

  /**
   * Unblock tenant
   */
  async unblockTenant(
    integrationId: string,
    tenantId: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const blockedTenants = (integration.blockedTenants || []).filter((id) => id !== tenantId);

    return this.updateIntegration(integrationId, {
      blockedTenants: blockedTenants.length > 0 ? blockedTenants : undefined,
      updatedBy,
    });
  }

  /**
   * Make integration available to all tenants (remove whitelist)
   */
  async makePublic(integrationId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null> {
    return this.updateIntegration(integrationId, {
      allowedTenants: null,
      updatedBy,
    });
  }

  /**
   * Make integration private (enable whitelist mode)
   */
  async makePrivate(
    integrationId: string,
    allowedTenants: string[],
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    return this.updateIntegration(integrationId, {
      allowedTenants,
      updatedBy,
    });
  }
}
