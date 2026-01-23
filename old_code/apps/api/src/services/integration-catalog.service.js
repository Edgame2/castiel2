/**
 * Integration Catalog Service
 *
 * Business logic for managing the integration catalog
 */
/**
 * Integration Catalog Service
 * Manages catalog operations for super admins
 */
export class IntegrationCatalogService {
    catalogRepository;
    constructor(catalogRepository) {
        this.catalogRepository = catalogRepository;
    }
    // ============================================
    // Catalog Entry Management
    // ============================================
    /**
     * Create new integration in catalog
     */
    async createIntegration(input) {
        // Validate shard mappings
        this.validateShardMappings(input.shardMappings);
        return this.catalogRepository.createCatalogEntry(input);
    }
    /**
     * Get integration details
     */
    async getIntegration(integrationId) {
        return this.catalogRepository.getCatalogEntryByIntegrationId(integrationId);
    }
    /**
     * List all integrations in catalog
     */
    async listIntegrations(options) {
        return this.catalogRepository.listCatalogEntries(options);
    }
    /**
     * Update integration in catalog
     */
    async updateIntegration(integrationId, input) {
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
    async deleteIntegration(integrationId) {
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
    async deprecateIntegration(integrationId, updatedBy) {
        const existing = await this.getIntegration(integrationId);
        if (!existing) {
            throw new Error(`Integration not found: ${integrationId}`);
        }
        return this.catalogRepository.deprecateCatalogEntry(existing.id, existing.category, updatedBy);
    }
    /**
     * Get integrations by category
     */
    async getIntegrationsByCategory(category) {
        return this.catalogRepository.getCatalogEntriesByCategory(category);
    }
    /**
     * Get premium integrations
     */
    async getPremiumIntegrations() {
        const { entries } = await this.catalogRepository.listCatalogEntries({
            filter: { requiredPlan: 'enterprise' },
        });
        return entries;
    }
    /**
     * Update integration's shard type mappings
     * Critical for defining which shard types this integration can sync to
     */
    async updateShardMappings(integrationId, mappings, updatedBy) {
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
    validateShardMappings(mappings) {
        for (const mapping of mappings) {
            // Each mapping must have at least one supported shard type
            if (!mapping.supportedShardTypes || mapping.supportedShardTypes.length === 0) {
                throw new Error(`Invalid mapping for entity ${mapping.integrationEntity}: must have at least one supported shard type`);
            }
            // Default shard type must be in supported list
            if (!mapping.supportedShardTypes.includes(mapping.defaultShardType)) {
                throw new Error(`Invalid mapping for entity ${mapping.integrationEntity}: default shard type ${mapping.defaultShardType} not in supported types`);
            }
        }
    }
    // ============================================
    // Visibility & Access Control
    // ============================================
    /**
     * Create visibility rule for tenant
     */
    async createVisibilityRule(input) {
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
    async getVisibilityRule(tenantId, integrationId) {
        return this.catalogRepository.getVisibilityRuleByTenantAndIntegration(tenantId, integrationId);
    }
    /**
     * Update visibility rule
     */
    async updateVisibilityRule(id, tenantId, input) {
        return this.catalogRepository.updateVisibilityRule(id, tenantId, input);
    }
    /**
     * Approve integration for tenant
     */
    async approveIntegration(tenantId, integrationId, approvedBy) {
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
    async denyIntegration(tenantId, integrationId, denialReason, approvedBy) {
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
    async hideIntegrationFromTenant(tenantId, integrationId, reason) {
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
    async showIntegrationToTenant(tenantId, integrationId) {
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
    async restrictCapabilitiesForTenant(tenantId, integrationId, allowedCapabilities, restrictedBy) {
        const integration = await this.getIntegration(integrationId);
        if (!integration) {
            throw new Error(`Integration not found: ${integrationId}`);
        }
        // Validate that requested capabilities are available
        const invalidCapabilities = allowedCapabilities.filter((cap) => !integration.capabilities.includes(cap));
        if (invalidCapabilities.length > 0) {
            throw new Error(`Invalid capabilities: ${invalidCapabilities.join(', ')} not available for this integration`);
        }
        let rule = await this.getVisibilityRule(tenantId, integrationId);
        if (!rule) {
            rule = await this.createVisibilityRule({
                tenantId,
                integrationId,
                customCapabilities: allowedCapabilities,
            });
            return rule;
        }
        return this.catalogRepository.updateVisibilityRule(rule.id, tenantId, {
            customCapabilities: allowedCapabilities,
        });
    }
    /**
     * Get visibility rules for integration (across all tenants)
     */
    async getVisibilityRulesForIntegration(integrationId) {
        return this.catalogRepository.listVisibilityRulesForIntegration(integrationId);
    }
    /**
     * Get visibility rules for tenant (across all integrations)
     */
    async getVisibilityRulesForTenant(tenantId) {
        return this.catalogRepository.listVisibilityRulesForTenant(tenantId);
    }
    // ============================================
    // Whitelist & Blocking Management
    // ============================================
    /**
     * Add tenant to whitelist for integration
     */
    async addTenantToWhitelist(integrationId, tenantId, updatedBy) {
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
    async removeTenantFromWhitelist(integrationId, tenantId, updatedBy) {
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
    async blockTenant(integrationId, tenantId, updatedBy) {
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
    async unblockTenant(integrationId, tenantId, updatedBy) {
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
    async makePublic(integrationId, updatedBy) {
        return this.updateIntegration(integrationId, {
            allowedTenants: null,
            updatedBy,
        });
    }
    /**
     * Make integration private (enable whitelist mode)
     */
    async makePrivate(integrationId, allowedTenants, updatedBy) {
        return this.updateIntegration(integrationId, {
            allowedTenants,
            updatedBy,
        });
    }
}
//# sourceMappingURL=integration-catalog.service.js.map