// @ts-nocheck - Optional service, not used by workers
/**
 * Risk Catalog Service
 * Manages risk catalog definitions (global, industry, tenant-specific)
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type {
  RiskCatalog,
  CreateRiskInput,
  UpdateRiskInput,
  CatalogType,
  RiskPonderation,
} from '../types/risk-analysis.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES, RISK_CATALOG_SHARD_TYPE } from '../types/core-shard-types.js';
import { v4 as uuidv4 } from 'uuid';
import type { CreateShardTypeInput } from '../types/shard-type.types.js';

export class RiskCatalogService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository
  ) {}

  /**
   * Ensure the risk catalog shard type exists, create it if it doesn't
   */
  private async ensureShardType(): Promise<void> {
    const SYSTEM_TENANT_ID = 'system';
    const SYSTEM_USER_ID = 'system';

    try {
      // Check if shard type already exists
      const existing = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        SYSTEM_TENANT_ID
      );

      if (existing) {
        return; // Already exists
      }

      // Create the shard type
      const input: CreateShardTypeInput = {
        tenantId: SYSTEM_TENANT_ID,
        name: RISK_CATALOG_SHARD_TYPE.name,
        displayName: RISK_CATALOG_SHARD_TYPE.displayName,
        description: RISK_CATALOG_SHARD_TYPE.description,
        category: RISK_CATALOG_SHARD_TYPE.category,
        schema: RISK_CATALOG_SHARD_TYPE.schema,
        schemaFormat: 'rich',
        isCustom: false,
        isGlobal: true,
        icon: RISK_CATALOG_SHARD_TYPE.icon,
        color: RISK_CATALOG_SHARD_TYPE.color,
        tags: RISK_CATALOG_SHARD_TYPE.tags,
        createdBy: SYSTEM_USER_ID,
      };

      await this.shardTypeRepository.create(input);

      this.monitoring.trackEvent('risk-catalog.shard-type.created', {
        name: RISK_CATALOG_SHARD_TYPE.name,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.ensureShardType',
        shardTypeName: CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
      });
      // Don't throw - let the calling method handle the missing shard type
    }
  }

  /**
   * Get applicable risk catalog for a tenant
   * Returns global, industry-specific (if applicable), and tenant-specific risks
   */
  async getCatalog(
    tenantId: string,
    industryId?: string
  ): Promise<RiskCatalog[]> {
    const startTime = Date.now();

    try {
      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type ID for risk catalog
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system' // Global shard types are in system tenant
      );

      if (!shardType) {
        this.monitoring.trackEvent('risk-catalog.shard-type-not-found', {
          tenantId,
        });
        return [];
      }

      // Get tenant-specific overrides (disabled risks)
      const tenantOverridesResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const disabledRiskIds = new Set(
        tenantOverridesResult.items
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
      const globalRisksResult = await this.shardRepository.list({
        tenantId: 'system',
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const globalRisks = globalRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.catalogType === 'global' && 
                 data?.isActive !== false &&
                 !disabledRiskIds.has(data?.riskId);
        }
      );

      // Query for industry-specific risks if industryId provided
      let industryRisks: Shard[] = [];
      if (industryId) {
        const industryRisksResult = await this.shardRepository.list({
          tenantId: 'system',
          shardTypeId: shardType.id,
          limit: 1000,
        });
        industryRisks = industryRisksResult.items.filter(
          shard => {
            const data = shard.structuredData;
            return (
              data?.catalogType === 'industry' &&
              data?.industryId === industryId &&
              data?.isActive !== false &&
              !disabledRiskIds.has(data?.riskId)
            );
          }
        );
      }

      // Query for tenant-specific risks
      const tenantRisksResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const tenantRisks = tenantRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.catalogType === 'tenant' && data?.isActive !== false;
        }
      );

      // Combine and convert to RiskCatalog format
      const allRisks = [...globalRisks, ...industryRisks, ...tenantRisks];
      const catalogs = allRisks.map(shard => this.shardToRiskCatalog(shard));

      this.monitoring.trackEvent('risk-catalog.retrieved', {
        tenantId,
        industryId,
        globalCount: globalRisks.length,
        industryCount: industryRisks.length,
        tenantCount: tenantRisks.length,
        totalCount: catalogs.length,
        durationMs: Date.now() - startTime,
      });

      return catalogs;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.getCatalog',
        tenantId,
        industryId,
      });
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
      const isSuperAdmin = userRoles?.some(role => 
        ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(role.toLowerCase())
      ) || false;

      // Default catalogType to 'tenant' if not provided
      const catalogType: 'global' | 'industry' | 'tenant' = input.catalogType || 'tenant';

      // Validate catalogType based on user role
      if (!isSuperAdmin && catalogType !== 'tenant') {
        throw new Error('Tenant admins can only create tenant-specific risks. Use catalogType "tenant"');
      }

      if (isSuperAdmin && catalogType === 'global' && input.industryId) {
        throw new Error('Global risks cannot have an industryId');
      }

      if (isSuperAdmin && catalogType === 'industry' && !input.industryId) {
        throw new Error('Industry risks must have an industryId');
      }

      // Determine the tenant where the risk should be stored
      // Global and industry risks are stored in 'system' tenant
      // Tenant-specific risks are stored in the user's tenant
      const storageTenantId = (catalogType === 'global' || catalogType === 'industry') 
        ? 'system' 
        : tenantId;

      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk catalog shard type not found');
      }

      // Check if riskId already exists in the storage tenant
      const existingResult = await this.shardRepository.list({
        tenantId: storageTenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
          const existing = existingResult.items.filter(
            shard => {
              const data = shard.structuredData;
              // For global/industry, check globally; for tenant, check in tenant
              if (catalogType === 'global') {
                return data?.riskId === input.riskId && data?.catalogType === 'global';
              } else if (catalogType === 'industry') {
                return data?.riskId === input.riskId && 
                       data?.catalogType === 'industry' && 
                       data?.industryId === input.industryId;
              } else {
                return data?.riskId === input.riskId;
              }
            }
          );

          if (existing.length > 0) {
            if (catalogType === 'global') {
              throw new Error(`Global risk with riskId "${input.riskId}" already exists`);
            } else if (catalogType === 'industry') {
              throw new Error(`Industry risk with riskId "${input.riskId}" for industry "${input.industryId}" already exists`);
            } else {
              throw new Error(`Risk with riskId "${input.riskId}" already exists for this tenant`);
            }
          }

          // Create shard
          const shard = await this.shardRepository.create({
            tenantId: storageTenantId,
            userId,
            shardTypeId: shardType.id,
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
      });

      const catalog = this.shardToRiskCatalog(shard);

      this.monitoring.trackEvent('risk-catalog.created', {
        tenantId,
        userId,
        riskId: input.riskId,
        durationMs: Date.now() - startTime,
      });

      return catalog;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.createCustomRisk',
        tenantId,
        userId,
        riskId: input.riskId,
      });
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
      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk catalog shard type not found');
      }

      // Find the risk shard
      const risksResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const risks = risksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.riskId === riskId;
        }
      );

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
      const updatedShard = await this.shardRepository.update(shard.id, tenantId, {
        structuredData: updatedData,
      });

      const catalog = this.shardToRiskCatalog(updatedShard);

      this.monitoring.trackEvent('risk-catalog.updated', {
        tenantId,
        userId,
        riskId,
        durationMs: Date.now() - startTime,
      });

      return catalog;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.updateRisk',
        tenantId,
        userId,
        riskId,
      });
      throw error;
    }
  }

  /**
   * Duplicate a global or industry risk to tenant-specific
   * Allows tenant admins to create a tenant-specific copy of a global/industry risk
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
      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk catalog shard type not found');
      }

      // Find the source risk (global or industry)
      const sourceTenantId = 'system';
      const sourceRisksResult = await this.shardRepository.list({
        tenantId: sourceTenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const sourceRisks = sourceRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          if (sourceCatalogType === 'global') {
            return data?.riskId === sourceRiskId && data?.catalogType === 'global';
          } else {
            return data?.riskId === sourceRiskId && 
                   data?.catalogType === 'industry' && 
                   data?.industryId === sourceIndustryId;
          }
        }
      );

      if (sourceRisks.length === 0) {
        throw new Error(`Source risk with riskId "${sourceRiskId}" not found`);
      }

      const sourceShard = sourceRisks[0];
      const sourceData = sourceShard.structuredData as any;

      // Generate new riskId if not provided
      const finalRiskId = newRiskId || `${sourceRiskId}-${targetTenantId.substring(0, 8)}`;

      // Check if riskId already exists in target tenant
      const existingResult = await this.shardRepository.list({
        tenantId: targetTenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const existing = existingResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.riskId === finalRiskId;
        }
      );

      if (existing.length > 0) {
        throw new Error(`Risk with riskId "${finalRiskId}" already exists in this tenant`);
      }

      // Create tenant-specific copy
      const shard = await this.shardRepository.create({
        tenantId: targetTenantId,
        userId,
        shardTypeId: shardType.id,
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
      });

      const catalog = this.shardToRiskCatalog(shard);

      this.monitoring.trackEvent('risk-catalog.duplicated', {
        sourceRiskId,
        sourceCatalogType,
        targetTenantId,
        userId,
        newRiskId: finalRiskId,
        durationMs: Date.now() - startTime,
      });

      return catalog;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.duplicateRisk',
        sourceRiskId,
        targetTenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Enable or disable a global/industry risk for a specific tenant
   * Creates a tenant-specific override that controls visibility
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
      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk catalog shard type not found');
      }

      // Find the source risk
      const sourceRisksResult = await this.shardRepository.list({
        tenantId: 'system',
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const sourceRisks = sourceRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          if (catalogType === 'global') {
            return data?.riskId === riskId && data?.catalogType === 'global';
          } else {
            return data?.riskId === riskId && 
                   data?.catalogType === 'industry' && 
                   data?.industryId === industryId;
          }
        }
      );

      if (sourceRisks.length === 0) {
        throw new Error(`Source risk with riskId "${riskId}" not found`);
      }

      // Check if tenant override already exists
      const tenantRisksResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const overrideKey = `risk-override-${riskId}-${catalogType}${industryId ? `-${industryId}` : ''}`;
      const existingOverrides = tenantRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.overrideKey === overrideKey;
        }
      );

      if (enabled) {
        // If enabling and override exists, remove it (to use the global/industry risk)
        if (existingOverrides.length > 0) {
          await this.shardRepository.delete(existingOverrides[0].id, tenantId);
        }
      } else {
        // If disabling, create or update override
        if (existingOverrides.length > 0) {
          // Update existing override
          await this.shardRepository.update(existingOverrides[0].id, tenantId, {
            structuredData: {
              ...existingOverrides[0].structuredData,
              enabled: false,
            },
          });
        } else {
          // Create new override
          await this.shardRepository.create({
            tenantId,
            userId,
            shardTypeId: shardType.id,
            structuredData: {
              overrideKey,
              riskId,
              catalogType,
              industryId,
              enabled: false,
              isOverride: true,
            },
          });
        }
      }

      this.monitoring.trackEvent('risk-catalog.setEnabledForTenant', {
        riskId,
        catalogType,
        tenantId,
        userId,
        enabled,
        durationMs: Date.now() - startTime,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.setRiskEnabledForTenant',
        riskId,
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete a risk catalog entry (tenant-specific only)
   */
  async deleteRisk(
    riskId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Ensure shard type exists
      await this.ensureShardType();

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk catalog shard type not found');
      }

      // Find the risk shard (only tenant-specific risks can be deleted)
      const risksResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });
      const risks = risksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.riskId === riskId && data?.catalogType === 'tenant';
        }
      );

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
      await this.shardRepository.delete(shard.id, tenantId);

      this.monitoring.trackEvent('risk-catalog.deleted', {
        tenantId,
        userId,
        riskId,
        durationMs: Date.now() - startTime,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.deleteRisk',
        tenantId,
        userId,
        riskId,
      });
      throw error;
    }
  }

  /**
   * Get effective ponderation (weight) for a risk
   * Checks for tenant/industry/opportunity_type overrides
   */
  async getPonderation(
    riskId: string,
    tenantId: string,
    industryId?: string,
    opportunityType?: string
  ): Promise<number> {
    try {
      // Ensure shard type exists
      await this.ensureShardType();

      // Get the risk catalog entry
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
        'system'
      );

      if (!shardType) {
        return 0.5; // Default fallback
      }

      // Search in system (global/industry) and tenant
      const [systemRisksResult, tenantRisksResult] = await Promise.all([
        this.shardRepository.list({
          tenantId: 'system',
          shardTypeId: shardType.id,
          limit: 1000,
        }),
        this.shardRepository.list({
          tenantId,
          shardTypeId: shardType.id,
          limit: 1000,
        }),
      ]);

      const systemRisks = systemRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.riskId === riskId;
        }
      );
      const tenantRisks = tenantRisksResult.items.filter(
        shard => {
          const data = shard.structuredData;
          return data?.riskId === riskId;
        }
      );

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
            (!p.effectiveTo || p.effectiveTo > new Date()) &&
            p.effectiveFrom <= new Date()
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
            (!p.effectiveTo || p.effectiveTo > new Date()) &&
            p.effectiveFrom <= new Date()
        );
        if (industryOverride) {
          return industryOverride.ponderation;
        }
      }

      // Check for tenant override
      const tenantOverride = ponderations.find(
        p =>
          p.scope === 'tenant' &&
          (!p.effectiveTo || p.effectiveTo > new Date()) &&
          p.effectiveFrom <= new Date()
      );
      if (tenantOverride) {
        return tenantOverride.ponderation;
      }

      // Return default ponderation
      return data.defaultPonderation || 0.5;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-catalog.getPonderation',
        tenantId,
        riskId,
        industryId,
      });
      // Return default on error
      return 0.5;
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

