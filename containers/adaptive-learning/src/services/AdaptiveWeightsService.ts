/**
 * AdaptiveWeightsService
 * CAIS read: getWeights(tenantId, component) and getModelSelection(tenantId, context).
 * Returns defaults when no record exists so callers never depend on learning being populated.
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import type { LearnedWeights, ModelSelection } from '../types/cais.types';
import { DEFAULT_WEIGHTS, DEFAULT_MODEL_SELECTION } from '../types/cais.types';

export interface TenantCaisConfig {
  tenantId: string;
  outcomeSyncToCais?: boolean;
  automaticLearningEnabled?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_TENANT_CAIS_CONFIG: TenantCaisConfig = {
  tenantId: '',
  outcomeSyncToCais: false,
  automaticLearningEnabled: false,
};

export class AdaptiveWeightsService {
  private weightsContainerName: string;
  private modelSelectionsContainerName: string;
  private tenantConfigContainerName: string;

  constructor() {
    const config = loadConfig();
    this.weightsContainerName = config.cosmos_db.containers?.adaptive_weights ?? 'adaptive_weights';
    this.modelSelectionsContainerName =
      config.cosmos_db.containers?.adaptive_model_selections ?? 'adaptive_model_selections';
    this.tenantConfigContainerName =
      config.cosmos_db.containers?.adaptive_tenant_config ?? 'adaptive_tenant_config';
  }

  /**
   * Get learned weights for a tenant and component. Returns defaults when no record exists.
   */
  async getWeights(tenantId: string, component: string): Promise<LearnedWeights> {
    const id = this.sanitizeId(component);
    try {
      const container = getContainer(this.weightsContainerName);
      const { resource } = await container.item(id, tenantId).read();
      if (!resource || typeof resource !== 'object') return { ...DEFAULT_WEIGHTS };
      const w = resource as Record<string, unknown>;
      const weights: LearnedWeights = {};
      for (const key of ['ruleBased', 'ml', 'ai', 'historical']) {
        if (typeof w[key] === 'number') weights[key] = w[key] as number;
      }
      return Object.keys(weights).length > 0 ? weights : { ...DEFAULT_WEIGHTS };
    } catch (error: unknown) {
      const code = (error as { code?: number })?.code;
      if (code === 404) return { ...DEFAULT_WEIGHTS };
      console.warn('AdaptiveWeightsService.getWeights failed', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        component,
        service: 'adaptive-learning',
      });
      return { ...DEFAULT_WEIGHTS };
    }
  }

  /**
   * Get model selection for a tenant and context. Returns default when no record exists.
   */
  async getModelSelection(tenantId: string, context: string): Promise<ModelSelection> {
    const id = this.sanitizeId(context);
    try {
      const container = getContainer(this.modelSelectionsContainerName);
      const { resource } = await container.item(id, tenantId).read();
      if (!resource || typeof resource !== 'object')
        return { ...DEFAULT_MODEL_SELECTION };
      const r = resource as Record<string, unknown>;
      const modelId = typeof r.modelId === 'string' ? r.modelId : DEFAULT_MODEL_SELECTION.modelId;
      const confidence = typeof r.confidence === 'number' ? r.confidence : DEFAULT_MODEL_SELECTION.confidence;
      return { modelId, confidence, version: typeof r.version === 'string' ? r.version : undefined };
    } catch (error: unknown) {
      const code = (error as { code?: number })?.code;
      if (code === 404) return { ...DEFAULT_MODEL_SELECTION };
      console.warn('AdaptiveWeightsService.getModelSelection failed', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        context,
        service: 'adaptive-learning',
      });
      return { ...DEFAULT_MODEL_SELECTION };
    }
  }

  /**
   * Upsert learned weights for a tenant and component (Super Admin override).
   */
  async upsertWeights(
    tenantId: string,
    component: string,
    body: Record<string, number | undefined>
  ): Promise<LearnedWeights> {
    const id = this.sanitizeId(component);
    const weights: LearnedWeights = {};
    for (const key of ['ruleBased', 'ml', 'ai', 'historical']) {
      if (typeof body[key] === 'number') weights[key] = body[key];
    }
    const doc = {
      id,
      tenantId,
      ...weights,
      updatedAt: new Date().toISOString(),
    };
    const container = getContainer(this.weightsContainerName);
    await container.items.upsert(doc, { partitionKey: tenantId } as Parameters<typeof container.items.upsert>[1]);
    return weights;
  }

  /**
   * Upsert model selection for a tenant and context (Super Admin override).
   */
  async upsertModelSelection(
    tenantId: string,
    context: string,
    body: { modelId: string; confidence: number; version?: string }
  ): Promise<ModelSelection> {
    const id = this.sanitizeId(context);
    const modelId = typeof body.modelId === 'string' ? body.modelId : DEFAULT_MODEL_SELECTION.modelId;
    const confidence = typeof body.confidence === 'number' ? body.confidence : DEFAULT_MODEL_SELECTION.confidence;
    const doc = {
      id,
      tenantId,
      modelId,
      confidence,
      version: typeof body.version === 'string' ? body.version : undefined,
      updatedAt: new Date().toISOString(),
    };
    const container = getContainer(this.modelSelectionsContainerName);
    await container.items.upsert(doc, { partitionKey: tenantId } as Parameters<typeof container.items.upsert>[1]);
    return { modelId, confidence, version: doc.version };
  }

  /**
   * List tenant IDs that have automaticLearningEnabled === true (Phase 12). Cross-partition query on adaptive_tenant_config.
   */
  async listTenantIdsWithAutomaticLearning(): Promise<string[]> {
    try {
      const container = getContainer(this.tenantConfigContainerName);
      const { resources } = await container.items
        .query<{ tenantId: string }>(
          {
            query: "SELECT c.tenantId FROM c WHERE c.id = 'config' AND c.automaticLearningEnabled = true",
            parameters: [],
          }
          // No partitionKey = cross-partition query
        )
        .fetchAll();
      return (resources ?? []).map((r) => r.tenantId).filter(Boolean);
    } catch (error: unknown) {
      console.warn('AdaptiveWeightsService.listTenantIdsWithAutomaticLearning failed', {
        error: error instanceof Error ? error.message : String(error),
        service: 'adaptive-learning',
      });
      return [];
    }
  }

  /**
   * Get per-tenant CAIS config (outcomeSyncToCais, automaticLearningEnabled). Defaults: both false when absent.
   */
  async getTenantConfig(tenantId: string): Promise<TenantCaisConfig> {
    const id = 'config';
    try {
      const container = getContainer(this.tenantConfigContainerName);
      const { resource } = await container.item(id, tenantId).read();
      if (!resource || typeof resource !== 'object') {
        return { ...DEFAULT_TENANT_CAIS_CONFIG, tenantId };
      }
      const r = resource as Record<string, unknown>;
      return {
        tenantId,
        outcomeSyncToCais: r.outcomeSyncToCais === true,
        automaticLearningEnabled: r.automaticLearningEnabled === true,
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
        updatedBy: typeof r.updatedBy === 'string' ? r.updatedBy : undefined,
      };
    } catch (error: unknown) {
      const code = (error as { code?: number })?.code;
      if (code === 404) return { ...DEFAULT_TENANT_CAIS_CONFIG, tenantId };
      console.warn('AdaptiveWeightsService.getTenantConfig failed', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'adaptive-learning',
      });
      return { ...DEFAULT_TENANT_CAIS_CONFIG, tenantId };
    }
  }

  /**
   * Upsert per-tenant CAIS config (Super Admin toggles).
   */
  async upsertTenantConfig(
    tenantId: string,
    body: { outcomeSyncToCais?: boolean; automaticLearningEnabled?: boolean },
    updatedBy?: string
  ): Promise<TenantCaisConfig> {
    const id = 'config';
    const current = await this.getTenantConfig(tenantId);
    const doc = {
      id,
      tenantId,
      outcomeSyncToCais: body.outcomeSyncToCais ?? current.outcomeSyncToCais ?? false,
      automaticLearningEnabled: body.automaticLearningEnabled ?? current.automaticLearningEnabled ?? false,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy ?? undefined,
    };
    const container = getContainer(this.tenantConfigContainerName);
    await container.items.upsert(doc, { partitionKey: tenantId } as Parameters<typeof container.items.upsert>[1]);
    return {
      tenantId: doc.tenantId,
      outcomeSyncToCais: doc.outcomeSyncToCais,
      automaticLearningEnabled: doc.automaticLearningEnabled,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
    };
  }

  private sanitizeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 255) || 'default';
  }
}
