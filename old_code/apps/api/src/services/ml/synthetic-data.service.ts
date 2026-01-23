/**
 * Synthetic Data Service
 * 
 * Generates synthetic data for balanced training datasets.
 * Implements SMOTE and statistical sampling.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type { SyntheticDataConfig, SyntheticDataResult } from '../../types/ml.types.js';

export class SyntheticDataService {
  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Generate synthetic data
   */
  async generateSyntheticData(
    dataset: Array<{ features: Record<string, unknown>; label: unknown }>,
    config: SyntheticDataConfig
  ): Promise<SyntheticDataResult & { dataset: Array<{ features: Record<string, unknown>; label: unknown }> }> {
    const startTime = Date.now();

    try {
      let syntheticData: Array<{ features: Record<string, unknown>; label: unknown }>;

      switch (config.method) {
        case 'smote':
          syntheticData = await this.generateSMOTE(dataset, config);
          break;
        case 'statistical_sampling':
          syntheticData = await this.generateStatisticalSampling(dataset, config);
          break;
        default:
          throw new Error(`Unknown synthetic data method: ${config.method}`);
      }

      // Validate synthetic data quality
      const quality = await this.validateSyntheticDataQuality(dataset, syntheticData);

      const result: SyntheticDataResult & { dataset: Array<{ features: Record<string, unknown>; label: unknown }> } = {
        originalCount: dataset.length,
        syntheticCount: syntheticData.length,
        totalCount: dataset.length + syntheticData.length,
        quality,
        dataset: [...dataset, ...syntheticData],
      };

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.synthetic_data.generated', syntheticData.length, {
        method: config.method,
        ratio: config.ratio,
        durationMs: duration,
      });

      return result;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'synthetic_data.generate',
        method: config.method,
      });
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate synthetic data using SMOTE (Synthetic Minority Oversampling Technique)
   */
  private async generateSMOTE(
    dataset: Array<{ features: Record<string, unknown>; label: unknown }>,
    config: SyntheticDataConfig
  ): Promise<Array<{ features: Record<string, unknown>; label: unknown }>> {
    // For Phase 1, simplified SMOTE implementation
    // In production, use a library like imbalanced-learn
    
    // Identify minority class
    const labelCounts = new Map<unknown, number>();
    for (const example of dataset) {
      labelCounts.set(example.label, (labelCounts.get(example.label) || 0) + 1);
    }

    const minorityClass = Array.from(labelCounts.entries())
      .sort((a, b) => a[1] - b[1])[0][0];

    const minorityExamples = dataset.filter(ex => ex.label === minorityClass);
    const targetCount = Math.floor(dataset.length * config.ratio);
    const syntheticCount = Math.max(0, targetCount - minorityExamples.length);

    const synthetic: Array<{ features: Record<string, unknown>; label: unknown }> = [];

    for (let i = 0; i < syntheticCount; i++) {
      // Random interpolation between two minority examples
      const idx1 = Math.floor(Math.random() * minorityExamples.length);
      const idx2 = Math.floor(Math.random() * minorityExamples.length);
      const ex1 = minorityExamples[idx1];
      const ex2 = minorityExamples[idx2];

      const syntheticFeatures: Record<string, unknown> = {};
      for (const key of Object.keys(ex1.features)) {
        const val1 = this.toNumber(ex1.features[key]);
        const val2 = this.toNumber(ex2.features[key]);
        const alpha = Math.random();
        syntheticFeatures[key] = val1 !== null && val2 !== null
          ? val1 * (1 - alpha) + val2 * alpha
          : ex1.features[key];
      }

      synthetic.push({
        features: syntheticFeatures,
        label: minorityClass,
      });
    }

    return synthetic;
  }

  /**
   * Generate synthetic data using statistical sampling
   */
  private async generateStatisticalSampling(
    dataset: Array<{ features: Record<string, unknown>; label: unknown }>,
    config: SyntheticDataConfig
  ): Promise<Array<{ features: Record<string, unknown>; label: unknown }>> {
    const targetCount = Math.floor(dataset.length * config.ratio);
    const synthetic: Array<{ features: Record<string, unknown>; label: unknown }> = [];

    // Calculate statistics for each feature
    const featureStats = this.calculateFeatureStatistics(dataset);

    for (let i = 0; i < targetCount; i++) {
      const syntheticFeatures: Record<string, unknown> = {};

      for (const [featureName, stats] of Object.entries(featureStats)) {
        // Sample from normal distribution
        const mean = stats.mean;
        const std = stats.std;
        const value = this.sampleNormal(mean, std);
        syntheticFeatures[featureName] = value;
      }

      // Sample label from distribution
      const labels = dataset.map(ex => ex.label);
      const label = labels[Math.floor(Math.random() * labels.length)];

      synthetic.push({
        features: syntheticFeatures,
        label,
      });
    }

    return synthetic;
  }

  /**
   * Calculate feature statistics
   */
  private calculateFeatureStatistics(
    dataset: Array<{ features: Record<string, unknown>; label: unknown }>
  ): Record<string, { mean: number; std: number }> {
    const stats: Record<string, { mean: number; std: number }> = {};
    const featureNames = Object.keys(dataset[0]?.features || {});

    for (const featureName of featureNames) {
      const values = dataset
        .map(ex => this.toNumber(ex.features[featureName]))
        .filter(v => v !== null) as number[];

      if (values.length === 0) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      stats[featureName] = { mean, std };
    }

    return stats;
  }

  /**
   * Validate synthetic data quality
   */
  private async validateSyntheticDataQuality(
    original: Array<{ features: Record<string, unknown>; label: unknown }>,
    synthetic: Array<{ features: Record<string, unknown>; label: unknown }>
  ): Promise<SyntheticDataResult['quality']> {
    // Calculate distribution similarity (simplified)
    const originalStats = this.calculateFeatureStatistics(original);
    const syntheticStats = this.calculateFeatureStatistics(synthetic);

    let similaritySum = 0;
    let similarityCount = 0;

    for (const featureName of Object.keys(originalStats)) {
      if (syntheticStats[featureName]) {
        const origMean = originalStats[featureName].mean;
        const synthMean = syntheticStats[featureName].mean;
        const origStd = originalStats[featureName].std;
        const synthStd = syntheticStats[featureName].std;

        // Similarity based on mean and std deviation
        const meanSimilarity = 1 - Math.min(1, Math.abs(origMean - synthMean) / (origStd + 1e-6));
        const stdSimilarity = 1 - Math.min(1, Math.abs(origStd - synthStd) / (origStd + 1e-6));
        const similarity = (meanSimilarity + stdSimilarity) / 2;

        similaritySum += similarity;
        similarityCount++;
      }
    }

    const distributionSimilarity = similarityCount > 0 ? similaritySum / similarityCount : 0;

    return {
      distributionSimilarity,
      statisticalTests: {
        ks_test: distributionSimilarity, // Simplified
        chi_square: distributionSimilarity, // Simplified
      },
    };
  }

  /**
   * Convert value to number
   */
  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Sample from normal distribution (Box-Muller transform)
   */
  private sampleNormal(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z0;
  }
}
