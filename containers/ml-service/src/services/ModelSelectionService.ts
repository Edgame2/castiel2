/**
 * ModelSelectionService (BI_SALES_RISK Plan §5.4, §874).
 * selectRiskScoringModel: global vs industry by >3000 examples and >5% improvement (full: Cosmos/Data Lake); stub: industry if endpoint configured.
 * selectWinProbabilityModel: stub returns win-probability-model.
 */

import { loadConfig } from '../config';

export interface ModelSelection {
  modelId: string;
  confidence: number;
}

function hasEndpoint(ep: Record<string, string> | undefined, key: string): boolean {
  const u = ep?.[key];
  return typeof u === 'string' && u.length > 0;
}

/**
 * Select risk-scoring model: global vs industry (Plan §5.4).
 * Stub: if industryId and risk_scoring_industry endpoint configured, use industry; else global.
 * Full: >3000 examples and >5% improvement from Cosmos/Data Lake (Phase 2).
 */
export function selectRiskScoringModel(
  _tenantId: string,
  industryId?: string,
  _features?: Record<string, unknown>
): ModelSelection {
  const config = loadConfig();
  const ep = config.azure_ml?.endpoints ?? {};
  if (industryId && hasEndpoint(ep, 'risk_scoring_industry')) {
    return { modelId: 'risk_scoring_industry', confidence: 0.8 };
  }
  if (hasEndpoint(ep, 'risk_scoring_global')) {
    return { modelId: 'risk_scoring_global', confidence: 0.8 };
  }
  if (hasEndpoint(ep, 'risk-scoring-model')) {
    return { modelId: 'risk-scoring-model', confidence: 0.8 };
  }
  return { modelId: 'risk_scoring_global', confidence: 0.5 };
}

/**
 * Select win-probability model (Plan §5.4).
 * Stub: returns win-probability-model when configured; else win_probability.
 */
export function selectWinProbabilityModel(_tenantId: string): ModelSelection {
  const config = loadConfig();
  const ep = config.azure_ml?.endpoints ?? {};
  if (hasEndpoint(ep, 'win-probability-model')) {
    return { modelId: 'win-probability-model', confidence: 0.8 };
  }
  if (hasEndpoint(ep, 'win_probability')) {
    return { modelId: 'win_probability', confidence: 0.8 };
  }
  return { modelId: 'win-probability-model', confidence: 0.5 };
}
