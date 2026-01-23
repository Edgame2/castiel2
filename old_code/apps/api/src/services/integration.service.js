/**
 * Integration Service
 * Business logic for managing tenant integration instances
 */
export class IntegrationService {
    integrationRepository;
    providerRepository;
    notificationService;
    auditLogService;
    userService;
    monitoring;
    constructor(integrationRepository, providerRepository, notificationService, auditLogService, userService, monitoring) {
        this.integrationRepository = integrationRepository;
        this.providerRepository = providerRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.userService = userService;
        this.monitoring = monitoring;
    }
    /**
     * Helper: Get tenant admin user IDs
     */
    async getTenantAdminUserIds(tenantId) {
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
                return roles.some(role => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            })
                .map(user => user.id);
            return adminUserIds;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'integration.get-tenant-admin-ids' });
            return [];
        }
    }
    /**
     * Helper: Send notification to tenant admins
     */
    async notifyTenantAdmins(tenantId, notification) {
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
                    metadata: {
                        source: 'integration_system',
                        ...notification.metadata,
                    },
                });
            }
        }
        catch (error) {
            // Don't fail if notification fails
            this.monitoring?.trackException(error, { operation: 'integration.send-tenant-admin-notification' });
        }
    }
    /**
     * Create integration instance
     */
    async createIntegration(input, user) {
        // Validate input
        if (!input.name || input.name.trim().length === 0) {
            throw new Error('Integration name is required');
        }
        if (!input.providerName || input.providerName.trim().length === 0) {
            throw new Error('Provider name is required');
        }
        // Validate provider exists and is available to tenant
        const provider = await this.providerRepository.findByIdAcrossCategories(input.integrationId);
        if (!provider) {
            throw new Error('Integration provider not found');
        }
        if (provider.audience === 'system') {
            throw new Error('This integration is not available for tenant configuration');
        }
        if (provider.status !== 'active' && provider.status !== 'beta') {
            throw new Error(`Integration provider is ${provider.status} and cannot be configured`);
        }
        // Check for duplicate name
        const existing = await this.integrationRepository.findByProviderAndName(input.tenantId, input.providerName, input.name);
        if (existing) {
            throw new Error(`Integration with name "${input.name}" already exists for this provider`);
        }
        // Generate credential secret name for Key Vault
        // Format: tenant-{tenantId}-{providerName}-{instanceId}-oauth
        const instanceId = input.name.toLowerCase().replace(/\s+/g, '-');
        const credentialSecretName = input.credentialSecretName ||
            `tenant-${input.tenantId}-${input.providerName}-${instanceId}-oauth`;
        const integration = await this.integrationRepository.create({
            ...input,
            credentialSecretName,
            status: 'pending',
            connectionStatus: undefined,
            allowedShardTypes: input.allowedShardTypes || [],
            settings: input.settings || {},
            enabledAt: new Date(),
            enabledBy: user.id,
        });
        // Audit log
        await this.auditLogService?.log({
            tenantId: input.tenantId,
            category: 'system',
            eventType: 'integration.instance.enabled',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: integration.id,
            targetType: 'integration',
            targetName: integration.name,
            message: `Integration instance "${integration.name}" created`,
            details: {
                providerId: input.integrationId,
                providerName: input.providerName,
                credentialSecretName,
            },
        });
        // Send notification to tenant admins
        if (this.notificationService) {
            try {
                await this.notificationService.createSystemNotification({
                    tenantId: input.tenantId,
                    userId: user.id, // Notify the user who created it
                    name: 'Integration Created',
                    content: `Integration "${integration.name}" has been created and is ready to configure.`,
                    link: `/integrations/${integration.id}`,
                    type: 'information',
                    priority: 'medium',
                    metadata: {
                        integrationId: integration.id,
                        integrationName: integration.name,
                        providerName: input.providerName,
                        action: 'created',
                    },
                });
            }
            catch (error) {
                // Don't fail if notification fails
                this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                    component: 'IntegrationService',
                    operation: 'createIntegration',
                    context: 'send-creation-notification',
                });
            }
        }
        return integration;
    }
    /**
     * Update integration
     */
    async updateIntegration(id, tenantId, input, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const updated = await this.integrationRepository.update(id, tenantId, input);
        if (!updated) {
            throw new Error('Failed to update integration');
        }
        // Audit log
        await this.auditLogService?.log({
            tenantId,
            category: 'system',
            eventType: 'integration.instance.config.updated',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: id,
            targetType: 'integration',
            targetName: updated.name,
            message: `Integration "${updated.name}" configuration updated`,
            details: {
                changes: Object.keys(input),
            },
        });
        // Send notification for configuration changes
        await this.notifyTenantAdmins(tenantId, {
            name: 'Integration Configuration Updated',
            content: `Integration "${updated.name}" configuration has been updated.`,
            link: `/integrations/${updated.id}`,
            type: 'information',
            metadata: {
                integrationId: updated.id,
                integrationName: updated.name,
                providerName: updated.providerName,
                eventType: 'integration.config.updated',
            },
        });
        return updated;
    }
    /**
     * Delete integration
     */
    async deleteIntegration(id, tenantId, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const deleted = await this.integrationRepository.delete(id, tenantId);
        if (deleted) {
            // Audit log
            await this.auditLogService?.log({
                tenantId,
                category: 'system',
                eventType: 'integration.instance.deleted',
                outcome: 'success',
                actorId: user.id,
                actorEmail: user.email,
                actorType: 'user', // tenant_admin is a role, not an actor type
                targetId: id,
                targetType: 'integration',
                targetName: existing.name,
                message: `Integration "${existing.name}" deleted`,
            });
        }
        return deleted;
    }
    /**
     * Activate integration
     */
    async activateIntegration(id, tenantId, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const updated = await this.integrationRepository.update(id, tenantId, {
            status: 'connected',
        });
        if (!updated) {
            throw new Error('Failed to activate integration');
        }
        // Audit log
        await this.auditLogService?.log({
            tenantId,
            category: 'system',
            eventType: 'integration.instance.activated',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: id,
            targetType: 'integration',
            targetName: updated.name,
            message: `Integration "${updated.name}" activated`,
        });
        // Send notification to tenant admins
        if (this.notificationService) {
            try {
                await this.notificationService.createSystemNotification({
                    tenantId,
                    userId: user.id, // Notify the user who activated it
                    name: 'Integration Activated',
                    content: `Integration "${updated.name}" has been activated and is now available for use.`,
                    link: `/integrations/${id}`,
                    type: 'information',
                    priority: 'medium',
                    metadata: {
                        integrationId: id,
                        integrationName: updated.name,
                        providerName: updated.providerName,
                        action: 'activated',
                    },
                });
            }
            catch (error) {
                // Don't fail if notification fails
                this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                    component: 'IntegrationService',
                    operation: 'activateIntegration',
                    context: 'send-activation-notification',
                });
            }
        }
        return updated;
    }
    /**
     * Deactivate integration
     */
    async deactivateIntegration(id, tenantId, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const updated = await this.integrationRepository.update(id, tenantId, {
            status: 'disabled',
        });
        if (!updated) {
            throw new Error('Failed to deactivate integration');
        }
        // Audit log
        await this.auditLogService?.log({
            tenantId,
            category: 'system',
            eventType: 'integration.instance.deactivated',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: id,
            targetType: 'integration',
            targetName: updated.name,
            message: `Integration "${updated.name}" deactivated`,
        });
        // Send notification to tenant admins
        if (this.notificationService) {
            try {
                await this.notificationService.createSystemNotification({
                    tenantId,
                    userId: user.id, // Notify the user who deactivated it
                    name: 'Integration Deactivated',
                    content: `Integration "${updated.name}" has been deactivated and is no longer available.`,
                    link: `/integrations/${id}`,
                    type: 'information',
                    priority: 'medium',
                    metadata: {
                        integrationId: id,
                        integrationName: updated.name,
                        providerName: updated.providerName,
                        action: 'deactivated',
                    },
                });
            }
            catch (error) {
                // Don't fail if notification fails
                this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                    component: 'IntegrationService',
                    operation: 'deactivateIntegration',
                    context: 'send-deactivation-notification',
                });
            }
        }
        return updated;
    }
    /**
     * Update data access configuration
     */
    async updateDataAccess(id, tenantId, allowedShardTypes, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const updated = await this.integrationRepository.update(id, tenantId, {
            allowedShardTypes,
        });
        if (!updated) {
            throw new Error('Failed to update data access');
        }
        // Audit log
        await this.auditLogService?.log({
            tenantId,
            category: 'system',
            eventType: 'integration.instance.data_access.updated',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: id,
            targetType: 'integration',
            targetName: updated.name,
            message: `Integration "${updated.name}" data access updated`,
            details: {
                allowedShardTypes,
            },
        });
        return updated;
    }
    /**
     * Update search configuration
     */
    async updateSearchConfig(id, tenantId, config, user) {
        const existing = await this.integrationRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Integration not found');
        }
        const updated = await this.integrationRepository.update(id, tenantId, {
            searchEnabled: config.searchEnabled,
            searchableEntities: config.searchableEntities,
            searchFilters: config.searchFilters,
        });
        if (!updated) {
            throw new Error('Failed to update search configuration');
        }
        // Audit log
        await this.auditLogService?.log({
            tenantId,
            category: 'system',
            eventType: 'integration.instance.search.updated',
            outcome: 'success',
            actorId: user.id,
            actorEmail: user.email,
            actorType: 'user', // tenant_admin is a role, not an actor type
            targetId: id,
            targetType: 'integration',
            targetName: updated.name,
            message: `Integration "${updated.name}" search configuration updated`,
        });
        return updated;
    }
    /**
     * List integrations
     */
    async listIntegrations(options) {
        return this.integrationRepository.list(options);
    }
    /**
     * Get integration by ID
     */
    async getIntegration(id, tenantId) {
        return this.integrationRepository.findById(id, tenantId);
    }
}
//# sourceMappingURL=integration.service.js.map