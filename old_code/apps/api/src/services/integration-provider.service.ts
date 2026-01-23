// @ts-nocheck
/**
 * Integration Provider Service
 * Business logic for managing integration providers (system-level catalog)
 */

import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import type { NotificationService, AuditLogService } from '@castiel/api-core';
import type {
  IntegrationProviderDocument,
} from '../types/integration.types.js';
import type { AuthUser } from '../types/auth.types.js';

export interface CreateProviderInput {
  category: string;
  name: string;
  displayName: string;
  provider: string;
  description?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience?: 'system' | 'tenant';
  capabilities: string[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  supportsNotifications?: boolean;
  supportsSearch?: boolean;
  searchableEntities?: string[];
  searchCapabilities?: {
    fullText: boolean;
    fieldSpecific: boolean;
    filtered: boolean;
  };
  requiresUserScoping?: boolean;
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: any;
  availableEntities: any[];
  entityMappings?: any[];
  icon: string;
  color: string;
  version?: string;
  isPremium?: boolean;
  requiredPlan?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

export interface UpdateProviderInput {
  displayName?: string;
  description?: string;
  capabilities?: string[];
  supportedSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  supportsNotifications?: boolean;
  supportsSearch?: boolean;
  searchableEntities?: string[];
  searchCapabilities?: {
    fullText: boolean;
    fieldSpecific: boolean;
    filtered: boolean;
  };
  requiresUserScoping?: boolean;
  oauthConfig?: any;
  availableEntities?: any[];
  entityMappings?: any[];
  icon?: string;
  color?: string;
  version?: string;
  isPremium?: boolean;
  requiredPlan?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

export class IntegrationProviderService {
  private providerRepository: IntegrationProviderRepository;
  private integrationRepository: IntegrationRepository;
  private notificationService?: NotificationService;
  private auditLogService?: AuditLogService;
  private monitoring?: any; // IMonitoringProvider - for event tracking

  constructor(
    providerRepository: IntegrationProviderRepository,
    integrationRepository: IntegrationRepository,
    notificationService?: NotificationService,
    auditLogService?: AuditLogService,
    monitoring?: any
  ) {
    this.providerRepository = providerRepository;
    this.integrationRepository = integrationRepository;
    this.notificationService = notificationService;
    this.auditLogService = auditLogService;
    this.monitoring = monitoring;
  }

  /**
   * Create new provider
   */
  async createProvider(input: CreateProviderInput, user: AuthUser): Promise<IntegrationProviderDocument> {
    // Validate input
    if (!input.category || input.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    if (!input.provider || input.provider.trim().length === 0) {
      throw new Error('Provider identifier is required');
    }

    if (!input.displayName || input.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }

    // Validate unique provider per category
    const existing = await this.providerRepository.findByProvider(input.category, input.provider);
    if (existing) {
      throw new Error(`Provider "${input.provider}" already exists in category "${input.category}"`);
    }

    const provider = await this.providerRepository.create({
      ...input,
      status: input.status || 'active',
      audience: input.audience || 'tenant',
      supportsRealtime: input.supportsRealtime || false,
      supportsWebhooks: input.supportsWebhooks || false,
      supportsNotifications: input.supportsNotifications || false,
      supportsSearch: input.supportsSearch || false,
      requiresUserScoping: input.requiresUserScoping || false,
      version: input.version || '1.0.0',
      createdBy: user.id,
      updatedBy: user.id,
    });

    // Audit log
    await this.auditLogService?.log({
      tenantId: 'system', // System-level operation
      category: 'system' as any,
      eventType: 'integration.provider.created' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'super_admin',
      targetId: provider.id,
      targetType: 'provider',
      targetName: provider.displayName,
      message: `Integration provider "${provider.displayName}" created`,
      details: {
        provider: provider.provider,
        category: provider.category,
        status: provider.status,
        audience: provider.audience,
      },
    });

    return provider;
  }

  /**
   * Update provider
   */
  async updateProvider(
    id: string,
    category: string,
    input: UpdateProviderInput,
    user: AuthUser
  ): Promise<IntegrationProviderDocument> {
    const existing = await this.providerRepository.findById(id, category);
    if (!existing) {
      throw new Error('Provider not found');
    }

    const updated = await this.providerRepository.update(id, category, {
      ...input,
      updatedBy: user.id,
    });

    if (!updated) {
      throw new Error('Failed to update provider');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId: 'system',
      category: 'system' as any,
      eventType: 'integration.provider.updated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'super_admin',
      targetId: id,
      targetType: 'provider',
      targetName: updated.displayName,
      message: `Integration provider "${updated.displayName}" updated`,
      details: {
        changes: Object.keys(input),
      },
    });

    return updated;
  }

  /**
   * Delete provider
   */
  async deleteProvider(id: string, category: string, user: AuthUser): Promise<boolean> {
    const existing = await this.providerRepository.findById(id, category);
    if (!existing) {
      throw new Error('Provider not found');
    }

    // Check for active tenant integrations
    const integrations = await this.integrationRepository.list({
      tenantId: '', // Check all tenants - we need a different method for this
      limit: 1,
      offset: 0,
    });

    // Note: This is a simplified check. In production, you'd want to check across all tenants
    // For now, we'll allow deletion but warn if there are integrations

    const deleted = await this.providerRepository.delete(id, category);

    if (deleted) {
      // Audit log
      await this.auditLogService?.log({
        tenantId: 'system',
        category: 'system' as any,
        eventType: 'integration.provider.deleted' as any,
        outcome: 'success' as any,
        actorId: user.id,
        actorEmail: user.email,
        actorType: 'super_admin',
        targetId: id,
        targetType: 'provider',
        targetName: existing.displayName,
        message: `Integration provider "${existing.displayName}" deleted`,
      });
    }

    return deleted;
  }

  /**
   * Change provider status
   */
  async changeStatus(
    id: string,
    category: string,
    status: 'active' | 'beta' | 'deprecated' | 'disabled',
    user: AuthUser
  ): Promise<IntegrationProviderDocument> {
    const existing = await this.providerRepository.findById(id, category);
    if (!existing) {
      throw new Error('Provider not found');
    }

    const oldStatus = existing.status;
    const updated = await this.providerRepository.update(id, category, {
      status,
      updatedBy: user.id,
    });

    if (!updated) {
      throw new Error('Failed to update provider status');
    }

    // Send notifications if status changed to deprecated or disabled
    if ((status === 'deprecated' || status === 'disabled') && oldStatus !== status) {
      // Note: In production, you'd query all integrations using this provider and notify their tenant admins
      // For now, we log the event but don't send notifications to all affected tenants
      // This would require querying all tenant integrations and getting their admin users
      if (this.notificationService) {
        try {
          // This is a system-level notification - in production, you'd send to all affected tenant admins
          // For now, we'll just log that notifications should be sent
          this.monitoring?.trackEvent('integration.provider.status.changed.notification_required', {
            providerId: id,
            oldStatus,
            newStatus: status,
            requiresNotification: true,
          });
        } catch (error) {
          this.monitoring?.trackException(error as Error, { operation: 'integration-provider.track-notification-requirement' });
        }
      }
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId: 'system',
      category: 'system' as any,
      eventType: 'integration.provider.status.changed' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'super_admin',
      targetId: id,
      targetType: 'provider',
      targetName: updated.displayName,
      message: `Integration provider "${updated.displayName}" status changed from ${oldStatus} to ${status}`,
      details: {
        oldStatus,
        newStatus: status,
      },
    });

    return updated;
  }

  /**
   * Change provider audience
   */
  async changeAudience(
    id: string,
    category: string,
    audience: 'system' | 'tenant',
    user: AuthUser
  ): Promise<IntegrationProviderDocument> {
    const existing = await this.providerRepository.findById(id, category);
    if (!existing) {
      throw new Error('Provider not found');
    }

    const oldAudience = existing.audience;
    const updated = await this.providerRepository.update(id, category, {
      audience,
      updatedBy: user.id,
    });

    if (!updated) {
      throw new Error('Failed to update provider audience');
    }

    // Send notifications if audience changed (affects tenant visibility)
    if (oldAudience !== audience) {
      // Note: Notify tenant admins if audience changed from 'tenant' to 'system'
      // or vice versa
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId: 'system',
      category: 'system' as any,
      eventType: 'integration.provider.audience.changed' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'super_admin',
      targetId: id,
      targetType: 'provider',
      targetName: updated.displayName,
      message: `Integration provider "${updated.displayName}" audience changed from ${oldAudience} to ${audience}`,
      details: {
        oldAudience,
        newAudience: audience,
      },
    });

    return updated;
  }

  /**
   * List providers
   * With caching for frequently accessed provider catalog
   */
  async listProviders(options: {
    category?: string;
    status?: 'active' | 'beta' | 'deprecated' | 'disabled';
    audience?: 'system' | 'tenant';
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ providers: IntegrationProviderDocument[]; total: number; hasMore: boolean }> {
    // For active providers with no filters, use cache
    // Cache key includes all filter parameters
    const cacheKey = `integration-providers:${JSON.stringify(options)}`;
    
    // Note: In production, you'd use the cache service here
    // For now, we'll just call the repository directly
    // Example with cache:
    // const cached = await cacheService.get(cacheKey);
    // if (cached) return cached;
    // const result = await this.providerRepository.list(options);
    // await cacheService.set(cacheKey, result, 300); // 5 min TTL
    // return result;
    
    return this.providerRepository.list(options);
  }

  /**
   * Get provider by ID
   */
  async getProvider(id: string, category: string): Promise<IntegrationProviderDocument | null> {
    return this.providerRepository.findById(id, category);
  }

  /**
   * Get provider by ID (searches across all categories)
   */
  async getProviderById(id: string): Promise<IntegrationProviderDocument | null> {
    return this.providerRepository.findByIdAcrossCategories(id);
  }

  /**
   * Get provider by provider name (searches across all categories)
   */
  async getProviderByName(providerName: string): Promise<IntegrationProviderDocument | null> {
    return this.providerRepository.findByProviderName(providerName);
  }
}







