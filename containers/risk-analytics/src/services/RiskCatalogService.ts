/**
 * Risk Catalog Service
 * Manages risk catalog definitions (global, industry, tenant-specific)
 * Uses shard-manager service for data storage
 */

import { ServiceClient } from '@coder/shared';
import { generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  RiskCatalog,
  CreateRiskInput,
  UpdateRiskInput,
  RiskPonderation,
} from '../types/risk-catalog.types';
import { publishRiskCatalogEvent } from '../events/publishers/RiskCatalogEventPublisher';

const RISK_CATALOG_SHARD_TYPE_NAME = 'risk_catalog';
const SYSTEM_TENANT_ID = 'system';

interface Shard {
  id: string;
  tenantId: string;
  userId: string;
  shardTypeId: string;
  shardTypeName?: string;
  structuredData: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ShardType {
  id: string;
  name: string;
  displayName: string;
  description: string;
  schema: any;
}

interface ShardListResponse {
  items: Shard[];
  total: number;
  hasMore: boolean;
}

export class RiskCatalogService {
  private shardManagerClient: ServiceClient;
  private config: ReturnType<typeof loadConfig>;
  private app: FastifyInstance | null = null;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager.url,
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 30000,
      },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId?: string): string {
    if (!this.app) {
      throw new Error('Fastify app not initialized');
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-catalog',
      serviceName: 'risk-catalog',
      tenantId: tenantId || SYSTEM_TENANT_ID,
    });
  }

  /**
   * Ensure the risk catalog shard type exists, create it if it doesn't
   */
  private async ensureShardType(): Promise<void> {
    try {
      const token = this.getServiceToken(SYSTEM_TENANT_ID);
      
      // Check if shard type already exists
      try {
        const shardTypes = await this.shardManagerClient.get<ShardType[]>(
          `/api/v1/shard-types?limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': SYSTEM_TENANT_ID,
            },
          }
        );

        if (Array.isArray(shardTypes)) {
          const existing = shardTypes.find(st => st.name === RISK_CATALOG_SHARD_TYPE_NAME);
          if (existing) {
            return; // Already exists
          }
        }
      } catch (error: unknown) {
        if ((error as { response?: { status?: number } })?.response?.status !== 404) {
          throw error;
        }
      }

      // Create the shard type
      const shardTypeInput = {
        name: RISK_CATALOG_SHARD_TYPE_NAME,
        displayName: 'Risk Catalog',
        description: 'Risk catalog definitions (global, industry, tenant-specific)',
        category: 'risk',
        schema: {
          type: 'object',
          properties: {
            catalogType: { type: 'string', enum: ['global', 'industry', 'tenant'] },
            industryId: { type: 'string' },
            riskId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            defaultPonderation: { type: 'number' },
            sourceShardTypes: { type: 'array', items: { type: 'string' } },
            detectionRules: { type: 'object' },
            explainabilityTemplate: { type: 'string' },
            ponderations: { type: 'array' },
            isActive: { type: 'boolean' },
            version: { type: 'number' },
            isOverride: { type: 'boolean' },
            enabled: { type: 'boolean' },
            overrideKey: { type: 'string' },
          },
        },
        schemaFormat: 'rich',
        isCustom: false,
        isGlobal: true,
      };

      await this.shardManagerClient.post(
        '/api/v1/shard-types',
        shardTypeInput,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': SYSTEM_TENANT_ID,
          },
        }
      );

      log.info('Risk catalog shard type created', {
        name: RISK_CATALOG_SHARD_TYPE_NAME,
        service: 'risk-catalog',
      });
    } catch (error: unknown) {
      log.error('Failed to ensure shard type', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.ensureShardType', service: 'risk-catalog' });
      // Don't throw - let the calling method handle the missing shard type
    }
  }

  /**
   * Get shard type ID by name
   */
  private async getShardTypeId(tenantId: string = SYSTEM_TENANT_ID): Promise<string | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const shardTypes = await this.shardManagerClient.get<ShardType[]>(
        `/api/v1/shard-types?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (Array.isArray(shardTypes)) {
        const shardType = shardTypes.find(st => st.name === RISK_CATALOG_SHARD_TYPE_NAME);
        if (shardType) {
          return shardType.id;
        }
      }
      return null;
    } catch (error: unknown) {
      log.error('Failed to get shard type', error instanceof Error ? error : new Error(String(error)), { service: 'risk-catalog' });
      return null;
    }
  }

  /**
   * Get applicable risk catalog for a tenant
   * Returns global, industry-specific (if applicable), and tenant-specific risks
   */
  async getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]> {
    const startTime = Date.now();

    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        log.warn('Risk catalog shard type not found', { tenantId, service: 'risk-catalog' });
        return [];
      }

      const token = this.getServiceToken(tenantId);

      // Get tenant-specific overrides (disabled risks)
      const tenantOverridesResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      const disabledRiskIds = new Set(
        tenantOverridesResponse.items
          .filter(shard => {
            const data = shard.structuredData;
            return data?.isOverride === true && data?.enabled === false;
          })
          .map(shard => {
            const data = shard.structuredData;
            return data?.riskId;
          })
      );

      // Query for global risks (tenantId = 'system')
      const systemToken = this.getServiceToken(SYSTEM_TENANT_ID);
      const globalRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
            'X-Tenant-ID': SYSTEM_TENANT_ID,
          },
        }
      );
      const globalRisks = globalRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return (
          data?.catalogType === 'global' &&
          data?.isActive !== false &&
          !disabledRiskIds.has(data?.riskId)
        );
      });

      // Query for industry-specific risks if industryId provided
      let industryRisks: Shard[] = [];
      if (industryId) {
        const industryRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
          `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${systemToken}`,
              'X-Tenant-ID': SYSTEM_TENANT_ID,
            },
          }
        );
        industryRisks = industryRisksResponse.items.filter(shard => {
          const data = shard.structuredData;
          return (
            data?.catalogType === 'industry' &&
            data?.industryId === industryId &&
            data?.isActive !== false &&
            !disabledRiskIds.has(data?.riskId)
          );
        });
      }

      // Query for tenant-specific risks
      const tenantRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      const tenantRisks = tenantRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.catalogType === 'tenant' && data?.isActive !== false;
      });

      // Combine and convert to RiskCatalog format
      const allRisks = [...globalRisks, ...industryRisks, ...tenantRisks];
      const catalogs = allRisks.map(shard => this.shardToRiskCatalog(shard));

      log.info('Risk catalog retrieved', {
        tenantId,
        industryId,
        globalCount: globalRisks.length,
        industryCount: industryRisks.length,
        tenantCount: tenantRisks.length,
        totalCount: catalogs.length,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });

      return catalogs;
    } catch (error: unknown) {
      log.error('Failed to get catalog', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.getCatalog', tenantId, industryId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Create a risk (global, industry, or tenant-specific based on user role)
   */
  async createCustomRisk(
    tenantId: string,
    userId: string,
    input: CreateRiskInput,
    userRoles?: string[]
  ): Promise<RiskCatalog> {
    const startTime = Date.now();

    try {
      // Check if user is super-admin
      const isSuperAdmin =
        userRoles?.some(role =>
          ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(
            role.toLowerCase()
          )
        ) || false;

      // Default catalogType to 'tenant' if not provided
      const catalogType: 'global' | 'industry' | 'tenant' = input.catalogType || 'tenant';

      // Validate catalogType based on user role
      if (!isSuperAdmin && catalogType !== 'tenant') {
        throw new Error(
          'Tenant admins can only create tenant-specific risks. Use catalogType "tenant"'
        );
      }

      if (isSuperAdmin && catalogType === 'global' && input.industryId) {
        throw new Error('Global risks cannot have an industryId');
      }

      if (isSuperAdmin && catalogType === 'industry' && !input.industryId) {
        throw new Error('Industry risks must have an industryId');
      }

      // Determine the tenant where the risk should be stored
      const storageTenantId =
        catalogType === 'global' || catalogType === 'industry' ? SYSTEM_TENANT_ID : tenantId;

      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const token = this.getServiceToken(storageTenantId);

      // Check if riskId already exists
      const existingResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': storageTenantId,
          },
        }
      );

      const existing = existingResponse.items.filter(shard => {
        const data = shard.structuredData;
        if (catalogType === 'global') {
          return data?.riskId === input.riskId && data?.catalogType === 'global';
        } else if (catalogType === 'industry') {
          return (
            data?.riskId === input.riskId &&
            data?.catalogType === 'industry' &&
            data?.industryId === input.industryId
          );
        } else {
          return data?.riskId === input.riskId;
        }
      });

      if (existing.length > 0) {
        if (catalogType === 'global') {
          throw new Error(`Global risk with riskId "${input.riskId}" already exists`);
        } else if (catalogType === 'industry') {
          throw new Error(
            `Industry risk with riskId "${input.riskId}" for industry "${input.industryId}" already exists`
          );
        } else {
          throw new Error(`Risk with riskId "${input.riskId}" already exists for this tenant`);
        }
      }

      // Create shard
      const shardInput = {
        shardTypeId,
        structuredData: {
          catalogType,
          industryId: input.industryId,
          riskId: input.riskId,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultPonderation: input.defaultPonderation,
          sourceShardTypes: input.sourceShardTypes,
          detectionRules: input.detectionRules,
          explainabilityTemplate: input.explainabilityTemplate,
          ponderations: [],
          isActive: true,
          version: 1,
        },
      };

      const shard = await this.shardManagerClient.post<Shard>(
        '/api/v1/shards',
        shardInput,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': storageTenantId,
          },
        }
      );

      const catalog = this.shardToRiskCatalog(shard);

      // Publish event
      await publishRiskCatalogEvent('risk.catalog.created', tenantId, {
        riskId: input.riskId,
        catalogType,
        tenantId: storageTenantId,
        industryId: input.industryId,
      });

      log.info('Risk catalog created', {
        tenantId,
        userId,
        riskId: input.riskId,
        catalogType,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });

      return catalog;
    } catch (error: unknown) {
      log.error('Failed to create risk', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.createCustomRisk', tenantId, userId, riskId: input.riskId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Update a risk catalog entry
   */
  async updateRisk(
    riskId: string,
    tenantId: string,
    userId: string,
    updates: UpdateRiskInput
  ): Promise<RiskCatalog> {
    const startTime = Date.now();

    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const token = this.getServiceToken(tenantId);

      // Find the risk shard
      const risksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const risks = risksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === riskId;
      });

      if (risks.length === 0) {
        throw new Error(`Risk with riskId "${riskId}" not found`);
      }

      const shard = risks[0];
      const currentData = shard.structuredData as any;

      // Update structured data
      const updatedData = {
        ...currentData,
        ...updates,
        version: (currentData.version || 1) + 1,
        updatedAt: new Date(),
      };

      // Update shard
      const updatedShard = await this.shardManagerClient.put<Shard>(
        `/api/v1/shards/${shard.id}`,
        {
          structuredData: updatedData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const catalog = this.shardToRiskCatalog(updatedShard);

      // Publish event
      await publishRiskCatalogEvent('risk.catalog.updated', tenantId, {
        riskId,
        changes: updates,
        tenantId,
      });

      log.info('Risk catalog updated', {
        tenantId,
        userId,
        riskId,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });

      return catalog;
    } catch (error: unknown) {
      log.error('Failed to update risk', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.updateRisk', tenantId, userId, riskId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Duplicate a global or industry risk to tenant-specific
   */
  async duplicateRisk(
    sourceRiskId: string,
    sourceCatalogType: 'global' | 'industry',
    sourceIndustryId: string | undefined,
    targetTenantId: string,
    userId: string,
    newRiskId?: string
  ): Promise<RiskCatalog> {
    const startTime = Date.now();

    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const systemToken = this.getServiceToken(SYSTEM_TENANT_ID);

      // Find the source risk (global or industry)
      const sourceRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
            'X-Tenant-ID': SYSTEM_TENANT_ID,
          },
        }
      );

      const sourceRisks = sourceRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        if (sourceCatalogType === 'global') {
          return data?.riskId === sourceRiskId && data?.catalogType === 'global';
        } else {
          return (
            data?.riskId === sourceRiskId &&
            data?.catalogType === 'industry' &&
            data?.industryId === sourceIndustryId
          );
        }
      });

      if (sourceRisks.length === 0) {
        throw new Error(`Source risk with riskId "${sourceRiskId}" not found`);
      }

      const sourceShard = sourceRisks[0];
      const sourceData = sourceShard.structuredData as any;

      // Generate new riskId if not provided
      const finalRiskId = newRiskId || `${sourceRiskId}-${targetTenantId.substring(0, 8)}`;

      const targetToken = this.getServiceToken(targetTenantId);

      // Check if riskId already exists in target tenant
      const existingResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${targetToken}`,
            'X-Tenant-ID': targetTenantId,
          },
        }
      );

      const existing = existingResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === finalRiskId;
      });

      if (existing.length > 0) {
        throw new Error(`Risk with riskId "${finalRiskId}" already exists in this tenant`);
      }

      // Create tenant-specific copy
      const shardInput = {
        shardTypeId,
        structuredData: {
          catalogType: 'tenant',
          riskId: finalRiskId,
          name: sourceData.name,
          description: sourceData.description,
          category: sourceData.category,
          defaultPonderation: sourceData.defaultPonderation,
          sourceShardTypes: sourceData.sourceShardTypes || [],
          detectionRules: sourceData.detectionRules || {},
          explainabilityTemplate: sourceData.explainabilityTemplate || '',
          ponderations: [],
          isActive: true,
          version: 1,
          duplicatedFrom: {
            riskId: sourceRiskId,
            catalogType: sourceCatalogType,
            industryId: sourceIndustryId,
          },
        },
      };

      const shard = await this.shardManagerClient.post<Shard>(
        '/api/v1/shards',
        shardInput,
        {
          headers: {
            Authorization: `Bearer ${targetToken}`,
            'X-Tenant-ID': targetTenantId,
          },
        }
      );

      const catalog = this.shardToRiskCatalog(shard);

      // Publish event
      await publishRiskCatalogEvent('risk.catalog.duplicated', targetTenantId, {
        sourceRiskId,
        targetRiskId: finalRiskId,
        tenantId: targetTenantId,
      });

      log.info('Risk catalog duplicated', {
        sourceRiskId,
        sourceCatalogType,
        targetTenantId,
        userId,
        newRiskId: finalRiskId,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });

      return catalog;
    } catch (error: unknown) {
      log.error('Failed to duplicate risk', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.duplicateRisk', sourceRiskId, targetTenantId, userId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Enable or disable a global/industry risk for a specific tenant
   */
  async setRiskEnabledForTenant(
    riskId: string,
    catalogType: 'global' | 'industry',
    industryId: string | undefined,
    tenantId: string,
    userId: string,
    enabled: boolean
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const systemToken = this.getServiceToken(SYSTEM_TENANT_ID);
      const tenantToken = this.getServiceToken(tenantId);

      // Find the source risk
      const sourceRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
            'X-Tenant-ID': SYSTEM_TENANT_ID,
          },
        }
      );

      const sourceRisks = sourceRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        if (catalogType === 'global') {
          return data?.riskId === riskId && data?.catalogType === 'global';
        } else {
          return (
            data?.riskId === riskId &&
            data?.catalogType === 'industry' &&
            data?.industryId === industryId
          );
        }
      });

      if (sourceRisks.length === 0) {
        throw new Error(`Source risk with riskId "${riskId}" not found`);
      }

      // Check if tenant override already exists
      const tenantRisksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${tenantToken}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const overrideKey = `risk-override-${riskId}-${catalogType}${industryId ? `-${industryId}` : ''}`;
      const existingOverrides = tenantRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.overrideKey === overrideKey;
      });

      if (enabled) {
        // If enabling and override exists, remove it (to use the global/industry risk)
        if (existingOverrides.length > 0) {
          await this.shardManagerClient.delete(`/api/v1/shards/${existingOverrides[0].id}`, {
            headers: {
              Authorization: `Bearer ${tenantToken}`,
              'X-Tenant-ID': tenantId,
            },
          });
        }
      } else {
        // If disabling, create or update override
        if (existingOverrides.length > 0) {
          // Update existing override
          await this.shardManagerClient.put(
            `/api/v1/shards/${existingOverrides[0].id}`,
            {
              structuredData: {
                ...existingOverrides[0].structuredData,
                enabled: false,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${tenantToken}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        } else {
          // Create new override
          await this.shardManagerClient.post(
            '/api/v1/shards',
            {
              shardTypeId,
              structuredData: {
                overrideKey,
                riskId,
                catalogType,
                industryId,
                enabled: false,
                isOverride: true,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${tenantToken}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        }
      }

      // Publish event
      await publishRiskCatalogEvent(
        enabled ? 'risk.catalog.enabled' : 'risk.catalog.disabled',
        tenantId,
        {
          riskId,
          catalogType,
          tenantId,
        }
      );

      log.info('Risk enabled/disabled for tenant', {
        riskId,
        catalogType,
        tenantId,
        userId,
        enabled,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });
    } catch (error: unknown) {
      log.error('Failed to set risk enabled for tenant', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.setRiskEnabledForTenant', riskId, tenantId, userId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Delete a risk catalog entry (tenant-specific only)
   */
  async deleteRisk(riskId: string, tenantId: string, userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const token = this.getServiceToken(tenantId);

      // Find the risk shard (only tenant-specific risks can be deleted)
      const risksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const risks = risksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === riskId && data?.catalogType === 'tenant';
      });

      if (risks.length === 0) {
        throw new Error(`Tenant-specific risk with riskId "${riskId}" not found`);
      }

      const shard = risks[0];
      const data = shard.structuredData as any;

      // Only allow deletion of tenant-specific risks
      if (data.catalogType !== 'tenant') {
        throw new Error('Only tenant-specific risks can be deleted');
      }

      // Delete the shard
      await this.shardManagerClient.delete(`/api/v1/shards/${shard.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
        },
      });

      // Publish event
      await publishRiskCatalogEvent('risk.catalog.deleted', tenantId, {
        riskId,
        tenantId,
      });

      log.info('Risk catalog deleted', {
        tenantId,
        userId,
        riskId,
        durationMs: Date.now() - startTime,
        service: 'risk-catalog',
      });
    } catch (error: unknown) {
      log.error('Failed to delete risk', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.deleteRisk', tenantId, userId, riskId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Get effective ponderation (weight) for a risk
   */
  async getPonderation(
    riskId: string,
    tenantId: string,
    industryId?: string,
    opportunityType?: string
  ): Promise<number> {
    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        return 0.5; // Default fallback
      }

      const systemToken = this.getServiceToken(SYSTEM_TENANT_ID);
      const tenantToken = this.getServiceToken(tenantId);

      // Search in system (global/industry) and tenant
      const [systemRisksResponse, tenantRisksResponse] = await Promise.all([
        this.shardManagerClient.get<ShardListResponse>(
          `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${systemToken}`,
              'X-Tenant-ID': SYSTEM_TENANT_ID,
            },
          }
        ),
        this.shardManagerClient.get<ShardListResponse>(
          `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${tenantToken}`,
              'X-Tenant-ID': tenantId,
            },
          }
        ),
      ]);

      const systemRisks = systemRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === riskId;
      });
      const tenantRisks = tenantRisksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === riskId;
      });

      const riskShard = tenantRisks[0] || systemRisks[0];
      if (!riskShard) {
        return 0.5; // Default fallback
      }

      const data = riskShard.structuredData as any;
      const ponderations: RiskPonderation[] = data.ponderations || [];

      // Check for most specific override first
      if (opportunityType) {
        const oppTypeOverride = ponderations.find(
          p =>
            p.scope === 'opportunity_type' &&
            p.scopeId === opportunityType &&
            (!p.effectiveTo || new Date(p.effectiveTo) > new Date()) &&
            new Date(p.effectiveFrom) <= new Date()
        );
        if (oppTypeOverride) {
          return oppTypeOverride.ponderation;
        }
      }

      if (industryId) {
        const industryOverride = ponderations.find(
          p =>
            p.scope === 'industry' &&
            p.scopeId === industryId &&
            (!p.effectiveTo || new Date(p.effectiveTo) > new Date()) &&
            new Date(p.effectiveFrom) <= new Date()
        );
        if (industryOverride) {
          return industryOverride.ponderation;
        }
      }

      // Check for tenant override
      const tenantOverride = ponderations.find(
        p =>
          p.scope === 'tenant' &&
          (!p.effectiveTo || new Date(p.effectiveTo) > new Date()) &&
          new Date(p.effectiveFrom) <= new Date()
      );
      if (tenantOverride) {
        return tenantOverride.ponderation;
      }

      // Return default ponderation
      return data.defaultPonderation || 0.5;
    } catch (error: unknown) {
      log.error('Failed to get ponderation', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.getPonderation', tenantId, riskId, industryId, service: 'risk-catalog' });
      // Return default on error
      return 0.5;
    }
  }

  /**
   * Set ponderation (weights) for a risk
   */
  async setPonderation(
    riskId: string,
    tenantId: string,
    userId: string,
    ponderations: RiskPonderation[]
  ): Promise<void> {
    try {
      await this.ensureShardType();
      const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);

      if (!shardTypeId) {
        throw new Error('Risk catalog shard type not found');
      }

      const token = this.getServiceToken(tenantId);

      // Find the risk shard
      const risksResponse = await this.shardManagerClient.get<ShardListResponse>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const risks = risksResponse.items.filter(shard => {
        const data = shard.structuredData;
        return data?.riskId === riskId;
      });

      if (risks.length === 0) {
        throw new Error(`Risk with riskId "${riskId}" not found`);
      }

      const shard = risks[0];
      const currentData = shard.structuredData as any;

      // Update ponderations
      const updatedData = {
        ...currentData,
        ponderations,
        version: (currentData.version || 1) + 1,
        updatedAt: new Date(),
      };

      await this.shardManagerClient.put(
        `/api/v1/shards/${shard.id}`,
        {
          structuredData: updatedData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      log.info('Risk ponderation updated', {
        tenantId,
        userId,
        riskId,
        service: 'risk-catalog',
      });
    } catch (error: unknown) {
      log.error('Failed to set ponderation', error instanceof Error ? error : new Error(String(error)), { operation: 'risk-catalog.setPonderation', tenantId, userId, riskId, service: 'risk-catalog' });
      throw error;
    }
  }

  /**
   * Convert shard to RiskCatalog
   */
  private shardToRiskCatalog(shard: Shard): RiskCatalog {
    const data = shard.structuredData as any;
    return {
      id: shard.id,
      tenantId: shard.tenantId,
      catalogType: data.catalogType,
      industryId: data.industryId,
      riskId: data.riskId,
      name: data.name,
      description: data.description,
      category: data.category,
      defaultPonderation: data.defaultPonderation,
      sourceShardTypes: data.sourceShardTypes || [],
      detectionRules: data.detectionRules,
      explainabilityTemplate: data.explainabilityTemplate,
      ponderations: data.ponderations || [],
      isActive: data.isActive !== false,
      version: data.version || 1,
      createdAt: shard.createdAt,
      updatedAt: shard.updatedAt,
    };
  }
}
