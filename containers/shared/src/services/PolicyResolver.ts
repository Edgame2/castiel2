/**
 * Policy Resolver (dataflow doc §5)
 * Single source for activation flags (integration_processing_settings) and
 * shard type analysis policy (risk_tenant_ml_config).
 * @module @coder/shared/services
 */

import { getContainer } from '../database/index.js';

/** Detection flag names used in integration_processing_settings (per shard type section). */
export const ACTIVATION_FLAG_NAMES = [
  'enabled',
  'sentimentAnalysis',
  'competitorDetection',
  'entityExtraction',
  'keyPhrases',
  'classification',
  'actionItemExtraction',
  'dealSignalDetection',
  'keyMomentDetection',
  'summarization',
  'urgencyDetection',
  'objectionDetection',
  'commitmentDetection',
  'stakeholderExtraction',
  'intentDetection',
  'engagementLevel',
  'themeClustering',
  'textExtraction',
  'ocrForImages',
  'contentAnalysis',
  'processAttachments',
  'filterSpam',
  'transcription',
  'speakerDiarization',
  'transcriptionQuality',
] as const;

export interface ShardTypeAnalysisPolicyEntry {
  useForRiskAnalysis: boolean;
  useForRecommendationGeneration: boolean;
}

export interface PolicyResolverOptions {
  integrationProcessingSettingsContainer?: string;
  riskTenantMlConfigContainer?: string;
}

const DEFAULT_INTEGRATION_PROCESSING_SETTINGS_CONTAINER = 'integration_processing_settings';
const DEFAULT_RISK_TENANT_ML_CONFIG_CONTAINER = 'risk_tenant_ml_config';

/** Map shardTypeId to integration_processing_settings section key. */
function getSettingsSectionKey(shardTypeId: string): string {
  const id = shardTypeId.toLowerCase();
  if (id === 'document') return 'documentProcessing';
  if (id === 'email') return 'emailProcessing';
  if (id === 'meeting') return 'meetingProcessing';
  if (id === 'message') return 'emailProcessing'; // fallback
  if (id === 'calendarevent') return 'meetingProcessing'; // fallback
  return id + 'Processing';
}

/**
 * Extract all boolean keys from an object as Record<string, boolean>.
 */
function extractBooleanFlags(obj: Record<string, unknown> | null | undefined): Record<string, boolean> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/**
 * Policy resolver: reads integration_processing_settings and risk_tenant_ml_config from Cosmos.
 */
export class PolicyResolver {
  private integrationProcessingSettingsContainer: string;
  private riskTenantMlConfigContainer: string;

  constructor(options: PolicyResolverOptions = {}) {
    this.integrationProcessingSettingsContainer =
      options.integrationProcessingSettingsContainer ?? DEFAULT_INTEGRATION_PROCESSING_SETTINGS_CONTAINER;
    this.riskTenantMlConfigContainer =
      options.riskTenantMlConfigContainer ?? DEFAULT_RISK_TENANT_ML_CONFIG_CONTAINER;
  }

  /**
   * Get activation flags for a tenant and shard type (which detections run).
   * Reads container integration_processing_settings; document keyed by tenantId.
   * Returns object keyed by detection flag (e.g. sentimentAnalysis, competitorDetection).
   * Missing shard type or section → returns {} (all flags false).
   */
  async getActivationFlags(tenantId: string, shardTypeId: string): Promise<Record<string, boolean>> {
    try {
      const container = getContainer(this.integrationProcessingSettingsContainer);
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchNext();

      const doc = resources?.[0] as Record<string, unknown> | undefined;
      if (!doc) return {};

      const sectionKey = getSettingsSectionKey(shardTypeId);
      const section = doc[sectionKey];
      return extractBooleanFlags(section as Record<string, unknown> | undefined);
    } catch {
      return {};
    }
  }

  /**
   * Get shard type analysis policy for a tenant (which shard types feed risk and recommendations).
   * Reads container risk_tenant_ml_config; document id = tenantId, partition key = tenantId.
   * Returns Record<shardTypeId, { useForRiskAnalysis, useForRecommendationGeneration }>.
   * Missing shard type in policy → treat as false (caller should default).
   */
  async getShardTypeAnalysisPolicy(
    tenantId: string
  ): Promise<Record<string, ShardTypeAnalysisPolicyEntry>> {
    try {
      const container = getContainer(this.riskTenantMlConfigContainer);
      const { resource } = await container.item(tenantId, tenantId).read();
      const doc = resource as Record<string, unknown> | undefined;
      if (!doc) return {};
      const policy = doc.shardTypeAnalysisPolicy;
      if (!policy || typeof policy !== 'object') return {};
      const out: Record<string, ShardTypeAnalysisPolicyEntry> = {};
      for (const [key, value] of Object.entries(policy)) {
        const v = value as Record<string, unknown> | undefined;
        if (v && typeof v.useForRiskAnalysis === 'boolean' && typeof v.useForRecommendationGeneration === 'boolean') {
          out[key] = {
            useForRiskAnalysis: v.useForRiskAnalysis,
            useForRecommendationGeneration: v.useForRecommendationGeneration,
          };
        }
      }
      return out;
    } catch {
      return {};
    }
  }
}
