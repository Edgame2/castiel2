/**
 * Layer 2 Feature Quality Monitor (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY, LAYER_2_FEATURE_ENGINEERING_REQUIREMENTS).
 * Track missing rates, outliers, drift; update FeatureMetadata statistics; emit feature.quality.alert.
 */

import { getContainer } from '@coder/shared/database';
import type {
  FeatureSnapshot,
  FeaturePurpose,
  FeatureStatistic,
} from '../types/feature-store.types';
import { loadConfig } from '../config';

/** Severity for quality alerts. */
export type QualityAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface QualityAlert {
  featureName?: string;
  issue: 'missing_rate' | 'outlier' | 'drift';
  severity: QualityAlertSeverity;
  value?: number;
  threshold?: number;
  message: string;
  timestamp: string;
}

const DEFAULT_MISSING_RATE_THRESHOLD = 0.1;
const DEFAULT_DRIFT_THRESHOLD = 0.2;

export class FeatureQualityMonitor {
  private snapshotContainerName: string;
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
    this.snapshotContainerName =
      this.config.cosmos_db?.containers?.feature_snapshots ?? 'ml_feature_snapshots';
  }

  /**
   * Compute per-feature statistics (mean, std, min, max, missingRate) from snapshots.
   */
  async computeStatistics(
    tenantId: string,
    purpose: FeaturePurpose,
    version: string,
    options: { maxSamples?: number } = {}
  ): Promise<FeatureStatistic[]> {
    const container = getContainer(this.snapshotContainerName);
    const maxSamples = options.maxSamples ?? 1000;
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.purpose = @purpose AND c.featureVersion = @version ORDER BY c.extractedAt DESC`;
    const { resources } = await container.items
      .query<FeatureSnapshot>({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@purpose', value: purpose },
          { name: '@version', value: version },
        ],
      })
      .fetchNext();
    const samples = (resources ?? []).slice(0, maxSamples);
    if (samples.length === 0) return [];

    const featureNames = new Set<string>();
    for (const s of samples) {
      for (const k of Object.keys(s.features ?? {})) featureNames.add(k);
    }
    const stats: FeatureStatistic[] = [];
    for (const name of featureNames) {
      const values = samples
        .map((s: FeatureSnapshot) => (s.features ?? {})[name])
        .filter((v: unknown) => v !== undefined && v !== null && typeof v === 'number' && !Number.isNaN(v)) as number[];
      const missingCount = samples.length - values.length;
      const missingRate = samples.length > 0 ? missingCount / samples.length : 0;
      let mean: number | undefined;
      let std: number | undefined;
      let min: number | undefined;
      let max: number | undefined;
      if (values.length > 0) {
        mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean!) ** 2, 0) / values.length;
        std = Math.sqrt(variance);
        min = Math.min(...values);
        max = Math.max(...values);
      }
      stats.push({
        name,
        mean,
        std,
        min,
        max,
        missingRate,
        sampleCount: samples.length,
      });
    }
    return stats;
  }

  /**
   * Check for quality issues (missing rate above threshold) and return alerts.
   */
  async checkQuality(
    tenantId: string,
    purpose: FeaturePurpose,
    version: string,
    options: {
      missingRateThreshold?: number;
      referenceStats?: FeatureStatistic[];
      driftThreshold?: number;
    } = {}
  ): Promise<QualityAlert[]> {
    const stats = await this.computeStatistics(tenantId, purpose, version, { maxSamples: 500 });
    const missingThreshold = options.missingRateThreshold ?? DEFAULT_MISSING_RATE_THRESHOLD;
    const alerts: QualityAlert[] = [];
    const now = new Date().toISOString();

    for (const s of stats) {
      if (s.missingRate != null && s.missingRate > missingThreshold) {
        const severity: QualityAlertSeverity =
          s.missingRate >= 0.5 ? 'critical' : s.missingRate >= 0.25 ? 'high' : s.missingRate >= 0.15 ? 'medium' : 'low';
        alerts.push({
          featureName: s.name,
          issue: 'missing_rate',
          severity,
          value: s.missingRate,
          threshold: missingThreshold,
          message: `Missing rate ${(s.missingRate * 100).toFixed(1)}% exceeds threshold ${(missingThreshold * 100).toFixed(0)}%`,
          timestamp: now,
        });
      }
    }

    if (options.referenceStats && options.driftThreshold != null) {
      const driftThreshold = options.driftThreshold ?? DEFAULT_DRIFT_THRESHOLD;
      for (const s of stats) {
        const ref = options.referenceStats.find((r) => r.name === s.name);
        if (ref?.mean != null && s.mean != null && ref.std != null && ref.std > 0) {
          const drift = Math.abs(s.mean - ref.mean) / ref.std;
          if (drift > driftThreshold) {
            alerts.push({
              featureName: s.name,
              issue: 'drift',
              severity: drift > 0.5 ? 'high' : 'medium',
              value: drift,
              threshold: driftThreshold,
              message: `Feature ${s.name} drift ${drift.toFixed(3)} exceeds threshold ${driftThreshold}`,
              timestamp: now,
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Detect outliers for a single feature (values beyond mean ± N std). Returns count of outliers in sample.
   */
  async countOutliers(
    tenantId: string,
    purpose: FeaturePurpose,
    version: string,
    featureName: string,
    nStd: number = 3
  ): Promise<{ count: number; total: number; alerts: QualityAlert[] }> {
    const stats = await this.computeStatistics(tenantId, purpose, version, { maxSamples: 500 });
    const feat = stats.find((s) => s.name === featureName);
    if (!feat || feat.mean == null || feat.std == null) {
      return { count: 0, total: 0, alerts: [] };
    }
    const container = getContainer(this.snapshotContainerName);
    const { resources } = await container.items
      .query<FeatureSnapshot>({
        query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.purpose = @purpose AND c.featureVersion = @version`,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@purpose', value: purpose },
          { name: '@version', value: version },
        ],
      })
      .fetchNext();
    const samples = resources ?? [];
    const lo = feat.mean! - nStd * feat.std;
    const hi = feat.mean! + nStd * feat.std;
    let count = 0;
    for (const s of samples) {
      const v = (s.features ?? {})[featureName];
      if (typeof v === 'number' && (v < lo || v > hi)) count++;
    }
    const alerts: QualityAlert[] = [];
    if (samples.length > 0 && count / samples.length > 0.05) {
      alerts.push({
        featureName,
        issue: 'outlier',
        severity: 'medium',
        value: count / samples.length,
        message: `Outlier rate ${((count / samples.length) * 100).toFixed(1)}% for ${featureName}`,
        timestamp: new Date().toISOString(),
      });
    }
    return { count, total: samples.length, alerts };
  }
}
