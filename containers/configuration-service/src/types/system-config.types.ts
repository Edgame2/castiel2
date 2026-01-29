/**
 * System configuration types (Super Admin §8.1)
 * Performance targets and throughput; stored as JSON in configuration_settings (key: system.performance, scope: global).
 */

export interface LatencyTargetGroup {
  p50: number;
  p95: number;
  p99: number;
}

export interface PerformanceTargetsConfig {
  latencyTargets: {
    featureExtraction: LatencyTargetGroup;
    mlPrediction: LatencyTargetGroup;
    explanation: LatencyTargetGroup;
    llmReasoning: LatencyTargetGroup;
    decisionEvaluation: LatencyTargetGroup;
    endToEnd: LatencyTargetGroup;
  };
  throughputTargets: {
    predictionsPerSecond: number;
    batchSize: number;
    concurrentRequests: number;
  };
  alerts: {
    alertIfExceeded: boolean;
    alertThreshold: number;
  };
}

const defaultLatency = (p95: number): LatencyTargetGroup => ({
  p50: Math.round(p95 * 0.5),
  p95,
  p99: Math.round(p95 * 1.2),
});

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTargetsConfig = {
  latencyTargets: {
    featureExtraction: defaultLatency(500),
    mlPrediction: defaultLatency(2000),
    explanation: defaultLatency(1000),
    llmReasoning: defaultLatency(3000),
    decisionEvaluation: defaultLatency(100),
    endToEnd: defaultLatency(5000),
  },
  throughputTargets: {
    predictionsPerSecond: 50,
    batchSize: 100,
    concurrentRequests: 100,
  },
  alerts: {
    alertIfExceeded: true,
    alertThreshold: 10,
  },
};

function mergeWithDefaults(partial: Partial<PerformanceTargetsConfig>): PerformanceTargetsConfig {
  const d = DEFAULT_PERFORMANCE_CONFIG;
  const lt = (partial.latencyTargets ?? {}) as Partial<PerformanceTargetsConfig['latencyTargets']>;
  const tt = (partial.throughputTargets ?? {}) as Partial<PerformanceTargetsConfig['throughputTargets']>;
  const al = (partial.alerts ?? {}) as Partial<PerformanceTargetsConfig['alerts']>;
  return {
    latencyTargets: {
      featureExtraction: { ...d.latencyTargets.featureExtraction, ...lt.featureExtraction },
      mlPrediction: { ...d.latencyTargets.mlPrediction, ...lt.mlPrediction },
      explanation: { ...d.latencyTargets.explanation, ...lt.explanation },
      llmReasoning: { ...d.latencyTargets.llmReasoning, ...lt.llmReasoning },
      decisionEvaluation: { ...d.latencyTargets.decisionEvaluation, ...lt.decisionEvaluation },
      endToEnd: { ...d.latencyTargets.endToEnd, ...lt.endToEnd },
    },
    throughputTargets: {
      predictionsPerSecond: tt.predictionsPerSecond ?? d.throughputTargets.predictionsPerSecond,
      batchSize: tt.batchSize ?? d.throughputTargets.batchSize,
      concurrentRequests: tt.concurrentRequests ?? d.throughputTargets.concurrentRequests,
    },
    alerts: {
      alertIfExceeded: al.alertIfExceeded ?? d.alerts.alertIfExceeded,
      alertThreshold: al.alertThreshold ?? d.alerts.alertThreshold,
    },
  };
}

export function normalizePerformanceConfig(
  value: unknown
): PerformanceTargetsConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return mergeWithDefaults(value as Partial<PerformanceTargetsConfig>);
  }
  return { ...DEFAULT_PERFORMANCE_CONFIG };
}
