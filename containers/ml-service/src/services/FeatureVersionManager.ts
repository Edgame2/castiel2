/**
 * Layer 2 Feature Version Manager (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY, LAYER_2_FEATURE_ENGINEERING_REQUIREMENTS).
 * Pin/resolve/deprecate feature versions; prevent training/serving skew.
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { NotFoundError } from '@coder/shared/utils/errors';
import type { FeatureMetadata, FeaturePurpose, FeatureStatistic } from '../types/feature-store.types';
import { loadConfig } from '../config';

const DEFAULT_VERSION = 'v1';

export class FeatureVersionManager {
  private metadataContainerName: string;
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
    this.metadataContainerName =
      this.config.cosmos_db?.containers?.feature_metadata ?? 'ml_feature_metadata';
  }

  /**
   * Resolve the feature version to use for inference (latest active or pinned).
   */
  async resolveVersion(tenantId: string, purpose: FeaturePurpose): Promise<string> {
    const container = getContainer(this.metadataContainerName);
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.purpose = @purpose AND (c.status = 'active' OR c.status = 'pinned') ORDER BY c.updatedAt DESC`;
    const { resources } = await container.items
      .query<FeatureMetadata>({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@purpose', value: purpose },
        ],
      })
      .fetchNext();
    const active = resources?.find((r: FeatureMetadata) => r.status === 'pinned') ?? resources?.[0];
    return active?.version ?? DEFAULT_VERSION;
  }

  /**
   * Pin a version for training (ensures training/serving consistency when same version used at serve time).
   */
  async pinVersion(tenantId: string, purpose: FeaturePurpose, version: string): Promise<FeatureMetadata> {
    const container = getContainer(this.metadataContainerName);
    const existing = await this.getMetadataByVersion(tenantId, purpose, version);
    if (existing.status === 'pinned') return existing;
    const updated: FeatureMetadata = {
      ...existing,
      status: 'pinned',
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await container.item(existing.id, tenantId).replace(updated);
    if (!resource) throw new Error('Failed to pin version');
    return resource as FeatureMetadata;
  }

  /**
   * Unpin (set back to active) or resolve to latest.
   */
  async unpinVersion(tenantId: string, purpose: FeaturePurpose, version: string): Promise<FeatureMetadata> {
    const existing = await this.getMetadataByVersion(tenantId, purpose, version);
    if (existing.status !== 'pinned') return existing;
    const container = getContainer(this.metadataContainerName);
    const updated: FeatureMetadata = {
      ...existing,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await container.item(existing.id, tenantId).replace(updated);
    if (!resource) throw new Error('Failed to unpin version');
    return resource as FeatureMetadata;
  }

  /**
   * Deprecate a version (no longer used for new training or inference).
   */
  async deprecateVersion(tenantId: string, purpose: FeaturePurpose, version: string): Promise<FeatureMetadata> {
    const existing = await this.getMetadataByVersion(tenantId, purpose, version);
    const container = getContainer(this.metadataContainerName);
    const updated: FeatureMetadata = {
      ...existing,
      status: 'deprecated',
      updatedAt: new Date().toISOString(),
      deprecatedAt: new Date().toISOString(),
    };
    const { resource } = await container.item(existing.id, tenantId).replace(updated);
    if (!resource) throw new Error('Failed to deprecate version');
    return resource as FeatureMetadata;
  }

  /**
   * Get metadata doc by tenant, purpose, version.
   */
  async getMetadataByVersion(
    tenantId: string,
    purpose: FeaturePurpose,
    version: string
  ): Promise<FeatureMetadata> {
    const container = getContainer(this.metadataContainerName);
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.purpose = @purpose AND c.version = @version`;
    const { resources } = await container.items
      .query<FeatureMetadata>({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@purpose', value: purpose },
          { name: '@version', value: version },
        ],
      })
      .fetchNext();
    if (!resources?.[0]) {
      throw new NotFoundError('Feature metadata', `purpose=${purpose} version=${version}`);
    }
    return resources[0];
  }

  /**
   * Create or update metadata for a version (e.g. when computing schema/stats). Idempotent upsert by tenantId + purpose + version.
   */
  async upsertMetadata(
    tenantId: string,
    purpose: FeaturePurpose,
    version: string,
    input: {
      featureNames: string[];
      statistics?: FeatureStatistic[];
      driftScore?: number;
    }
  ): Promise<FeatureMetadata> {
    const container = getContainer(this.metadataContainerName);
    const now = new Date().toISOString();
    let existing: FeatureMetadata | null = null;
    try {
      existing = await this.getMetadataByVersion(tenantId, purpose, version);
    } catch {
      // No existing doc
    }
    if (existing) {
      const updated: FeatureMetadata = {
        ...existing,
        featureNames: input.featureNames,
        statistics: input.statistics,
        driftScore: input.driftScore,
        updatedAt: now,
      };
      const { resource } = await container.item(existing.id, tenantId).replace(updated);
      if (!resource) throw new Error('Failed to update feature metadata');
      return resource as FeatureMetadata;
    }
    const doc: FeatureMetadata = {
      id: uuidv4(),
      tenantId,
      purpose,
      version,
      status: 'active',
      featureNames: input.featureNames,
      statistics: input.statistics,
      driftScore: input.driftScore,
      createdAt: now,
      updatedAt: now,
    };
    const { resource } = await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
    if (!resource) throw new Error('Failed to create feature metadata');
    return resource as FeatureMetadata;
  }

  /**
   * List all metadata docs for a tenant (optional purpose filter).
   */
  async listMetadata(
    tenantId: string,
    purpose?: FeaturePurpose
  ): Promise<FeatureMetadata[]> {
    const container = getContainer(this.metadataContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: { name: string; value: string }[] = [{ name: '@tenantId', value: tenantId }];
    if (purpose) {
      query += ' AND c.purpose = @purpose';
      parameters.push({ name: '@purpose', value: purpose });
    }
    query += ' ORDER BY c.purpose ASC, c.updatedAt DESC';
    const { resources } = await container.items
      .query<FeatureMetadata>({ query, parameters })
      .fetchNext();
    return resources ?? [];
  }
}
