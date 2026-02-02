/**
 * CAIS (Context-Aware Intelligent System) types for weights and model selection
 */

export interface LearnedWeights {
  ruleBased?: number;
  ml?: number;
  ai?: number;
  historical?: number;
  [key: string]: number | undefined;
}

export interface ModelSelection {
  modelId: string;
  confidence: number;
  version?: string;
}

export const DEFAULT_WEIGHTS: LearnedWeights = {
  ruleBased: 0.9,
  ml: 0.9,
  ai: 0.85,
  historical: 0.85,
};

export const DEFAULT_MODEL_SELECTION: ModelSelection = {
  modelId: 'default-risk-model',
  confidence: 0.8,
};
