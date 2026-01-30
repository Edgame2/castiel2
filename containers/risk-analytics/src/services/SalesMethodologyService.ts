/**
 * Sales Methodology Service (Plan W8 – REQUIREMENTS_GAP_ANALYSIS Gap 2)
 * CRUD for tenant-specific sales methodology (stages, requirements, exit criteria, MEDDIC).
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import type { SalesMethodology, SalesMethodologyDocument, UpsertSalesMethodologyBody } from '../types/sales-methodology.types';

export class SalesMethodologyService {
  private containerName: string;

  constructor() {
    const config = loadConfig();
    this.containerName = config.cosmos_db.containers.sales_methodology ?? 'risk_sales_methodology';
  }

  /**
   * §3.1.1 List methodology type counts across all tenants (for templates usage stats).
   * Cross-partition query; returns map of methodologyType -> tenant count.
   */
  async listMethodologyTypeCounts(): Promise<Record<string, number>> {
    const container = getContainer(this.containerName);
    try {
      const { resources } = await container.items
        .query<{ methodologyType?: string }>({ query: 'SELECT c.methodologyType FROM c' })
        .fetchAll();
      const counts: Record<string, number> = {};
      for (const r of resources) {
        const t = r?.methodologyType;
        if (typeof t === 'string') counts[t] = (counts[t] ?? 0) + 1;
      }
      return counts;
    } catch (err: unknown) {
      log.error('SalesMethodologyService.listMethodologyTypeCounts failed', err as Error, { service: 'risk-analytics' });
      return {};
    }
  }

  /**
   * Get sales methodology for a tenant. One document per tenant (id = tenantId, partitionKey = tenantId).
   */
  async getByTenantId(tenantId: string): Promise<SalesMethodologyDocument | null> {
    const container = getContainer(this.containerName);
    try {
      const { resource } = await container.item(tenantId, tenantId).read();
      if (!resource) return null;
      return resource as SalesMethodologyDocument;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) return null;
      log.error('SalesMethodologyService.getByTenantId failed', err as Error, { tenantId, service: 'risk-analytics' });
      throw err;
    }
  }

  /**
   * Upsert sales methodology for a tenant. Replaces existing document.
   */
  async upsert(tenantId: string, body: UpsertSalesMethodologyBody): Promise<SalesMethodologyDocument> {
    const container = getContainer(this.containerName);
    const now = new Date().toISOString();
    const existing = await this.getByTenantId(tenantId);
    const meddic = body.meddic !== undefined ? body.meddic : (existing?.meddic);
    const integrationConfig = body.integrationConfig !== undefined ? body.integrationConfig : existing?.integrationConfig;
    const payload: SalesMethodology = {
      tenantId,
      methodologyType: body.methodologyType,
      stages: body.stages,
      requiredFields: body.requiredFields ?? [],
      risks: body.risks ?? [],
      name: body.name !== undefined ? body.name : existing?.name,
      displayName: body.displayName !== undefined ? body.displayName : existing?.displayName,
      description: body.description !== undefined ? body.description : existing?.description,
      isActive: body.isActive !== undefined ? body.isActive : existing?.isActive,
      isDefault: body.isDefault !== undefined ? body.isDefault : existing?.isDefault,
      ...(meddic !== undefined && { meddic }),
      ...(integrationConfig !== undefined && { integrationConfig }),
    };
    const doc: SalesMethodologyDocument = {
      ...payload,
      id: tenantId,
      createdAt: now,
      updatedAt: now,
    };
    if (existing) {
      doc.createdAt = (existing as SalesMethodologyDocument).createdAt;
    }
    await container.items.upsert(doc);
    log.info('SalesMethodologyService.upsert', { tenantId, methodologyType: payload.methodologyType, service: 'risk-analytics' });
    return doc;
  }
}
