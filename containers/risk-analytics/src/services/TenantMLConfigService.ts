/**
 * Tenant ML Configuration Service (Plan W10 – REQUIREMENTS_GAP_ANALYSIS Gap 4)
 * CRUD for tenant-specific ML configuration (risk tolerance, decision preferences, model preferences, custom features).
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import type {
  TenantMLConfiguration,
  TenantMLConfigurationDocument,
  UpsertTenantMLConfigBody,
} from '../types/tenant-ml-config.types';

export class TenantMLConfigService {
  private containerName: string;

  constructor() {
    const config = loadConfig();
    this.containerName = config.cosmos_db.containers.tenant_ml_config ?? 'risk_tenant_ml_config';
  }

  /**
   * Get tenant ML configuration. One document per tenant (id = tenantId, partitionKey = tenantId).
   */
  async getByTenantId(tenantId: string): Promise<TenantMLConfigurationDocument | null> {
    const container = getContainer(this.containerName);
    try {
      const { resource } = await container.item(tenantId, tenantId).read();
      if (!resource) return null;
      return resource as TenantMLConfigurationDocument;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) return null;
      log.error('TenantMLConfigService.getByTenantId failed', err as Error, { tenantId, service: 'risk-analytics' });
      throw err;
    }
  }

  /**
   * Upsert tenant ML configuration. Replaces existing document.
   */
  async upsert(tenantId: string, body: UpsertTenantMLConfigBody): Promise<TenantMLConfigurationDocument> {
    const container = getContainer(this.containerName);
    const now = new Date().toISOString();
    const payload: TenantMLConfiguration = {
      tenantId,
      riskTolerance: body.riskTolerance,
      decisionPreferences: body.decisionPreferences,
      modelPreferences: body.modelPreferences,
      customFeatures: body.customFeatures ?? [],
    };
    const doc: TenantMLConfigurationDocument = {
      ...payload,
      id: tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const existing = await this.getByTenantId(tenantId);
    if (existing) {
      doc.createdAt = (existing as TenantMLConfigurationDocument).createdAt;
    }
    await container.items.upsert(doc);
    log.info('TenantMLConfigService.upsert', { tenantId, service: 'risk-analytics' });
    return doc;
  }
}
