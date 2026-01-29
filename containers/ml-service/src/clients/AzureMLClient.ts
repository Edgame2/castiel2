/**
 * Azure ML Managed Endpoint client (BI_SALES_RISK Plan §5.4, W4 Layer 3).
 * POSTs feature vectors to scoring URLs from config.azure_ml.endpoints.
 * Circuit breaker and retry with exponential backoff per endpoint (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY).
 * On failure, caller falls back to heuristics (Plan §5.7).
 */

import { ServiceClient } from '@coder/shared';

/** Default inference timeout 2s (W4 Layer 3; plan: timeout 2s default). */
const DEFAULT_INFERENCE_TIMEOUT_MS = 2000;
/** Revenue forecast may take longer. */
const FORECAST_TIMEOUT_MS = 20000;

export interface AzureMLConfig {
  endpoints?: Record<string, string>;
  api_key?: string;
}

/**
 * REST client for Azure ML Managed Endpoints.
 * predict(modelId, features) returns a numeric score or throws.
 * Caches ServiceClient per endpoint URL so circuit breaker state is shared across calls.
 */
export class AzureMLClient {
  private endpoints: Record<string, string>;
  private apiKey: string;
  private clientCache: Map<string, ServiceClient> = new Map();

  constructor(cfg: AzureMLConfig) {
    this.endpoints = cfg?.endpoints ?? {};
    this.apiKey = cfg?.api_key ?? '';
  }

  /**
   * Get or create ServiceClient for endpoint URL (circuit breaker + retry shared per endpoint).
   * Timeout is passed per-request in call options.
   */
  private getClient(url: string): ServiceClient {
    let client = this.clientCache.get(url);
    if (!client) {
      client = new ServiceClient({
        baseURL: url,
        timeout: FORECAST_TIMEOUT_MS,
        retries: 3,
        circuitBreaker: { enabled: true, threshold: 5, timeout: 30000 },
      });
      this.clientCache.set(url, client);
    }
    return client;
  }

  /** Returns true if the given model has a configured scoring URL. */
  hasEndpoint(modelId: string): boolean {
    const url = this.endpoints[modelId];
    return typeof url === 'string' && url.length > 0;
  }

  /**
   * Run prediction for the given model and feature vector.
   * @returns Extracted numeric prediction (e.g. probability or risk score).
   * @throws On missing endpoint, HTTP error, or when the response cannot be parsed to a number.
   */
  async predict(modelId: string, features: Record<string, number>): Promise<number> {
    const url = this.endpoints[modelId];
    if (!url || typeof url !== 'string') {
      throw new Error(`Azure ML endpoint not configured for model: ${modelId}`);
    }

    const columns = Object.keys(features);
    const row = columns.map((c) => features[c]);
    const body = {
      input_data: {
        columns,
        data: [row],
      },
    };

    const client = this.getClient(url);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['Api-Key'] = this.apiKey;
    }
    const res = await client.post<unknown>('', body, { headers, timeout: DEFAULT_INFERENCE_TIMEOUT_MS });
    const v = this.extractNumber(res);
    if (typeof v === 'number' && !isNaN(v)) {
      return Math.min(1, Math.max(0, v));
    }
    throw new Error(`Azure ML response for ${modelId} could not be parsed to a number`);
  }

  /**
   * Prophet revenue-forecasting: request { history: [ [ds,y], ... ], periods?: number }, response { p10, p50, p90 } (arrays).
   * Uses endpoint key 'revenue_forecasting'. Plan §5.2, §877. Returns scalars from first period.
   */
  async predictRevenueForecast(
    modelId: string,
    history: Array<[string, number]>,
    periods: number = 1
  ): Promise<{ p10: number; p50: number; p90: number }> {
    const url = this.endpoints[modelId];
    if (!url || typeof url !== 'string') {
      throw new Error(`Azure ML endpoint not configured for model: ${modelId}`);
    }
    const body = { history, periods: Math.max(1, Math.min(periods, 365)) };

    const client = this.getClient(url);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['Api-Key'] = this.apiKey;
    }
    const res = await client.post<{ p10?: number[]; p50?: number[]; p90?: number[] }>('', body, { headers, timeout: FORECAST_TIMEOUT_MS });
    const p50Arr = Array.isArray(res?.p50) ? res.p50 : [];
    const p10Arr = Array.isArray(res?.p10) ? res.p10 : p50Arr;
    const p90Arr = Array.isArray(res?.p90) ? res.p90 : p50Arr;
    const p50 = p50Arr[0] ?? 0;
    const p10 = p10Arr[0] ?? p50 * 0.7;
    const p90 = p90Arr[0] ?? p50 * 1.3;
    return { p10, p50, p90 };
  }

  /**
   * LSTM risk-trajectory: request { sequence: number[][] }, response { risk_30, risk_60, risk_90, confidence }.
   * Uses endpoint key 'risk_trajectory_lstm'. Plan §5.5, §875.
   */
  async predictLstmTrajectory(
    modelId: string,
    sequence: number[][]
  ): Promise<{ risk_30: number; risk_60: number; risk_90: number; confidence: number }> {
    const url = this.endpoints[modelId];
    if (!url || typeof url !== 'string') {
      throw new Error(`Azure ML endpoint not configured for model: ${modelId}`);
    }
    const body = { sequence };

    const client = this.getClient(url);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['Api-Key'] = this.apiKey;
    }
    const res = await client.post<Record<string, unknown>>('', body, { headers, timeout: DEFAULT_INFERENCE_TIMEOUT_MS });
    const o = res && typeof res === 'object' ? res : {};
    const risk_30 = typeof o.risk_30 === 'number' ? o.risk_30 : 0.5;
    const risk_60 = typeof o.risk_60 === 'number' ? o.risk_60 : 0.5;
    const risk_90 = typeof o.risk_90 === 'number' ? o.risk_90 : 0.5;
    const confidence = typeof o.confidence === 'number' ? o.confidence : 0.5;
    return {
      risk_30: Math.min(1, Math.max(0, risk_30)),
      risk_60: Math.min(1, Math.max(0, risk_60)),
      risk_90: Math.min(1, Math.max(0, risk_90)),
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  }

  /**
   * Anomaly model: request { input: [features] }, response { isAnomaly, anomalyScore }.
   * Uses endpoint key 'anomaly' (azure_ml.endpoints.anomaly). Plan §5.5.
   */
  async predictAnomaly(modelId: string, features: Record<string, number>): Promise<{ isAnomaly: number; anomalyScore: number }> {
    const url = this.endpoints[modelId];
    if (!url || typeof url !== 'string') {
      throw new Error(`Azure ML endpoint not configured for model: ${modelId}`);
    }
    const body = { input: [features] };

    const client = this.getClient(url);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['Api-Key'] = this.apiKey;
    }
    const res = await client.post<unknown>('', body, { headers, timeout: DEFAULT_INFERENCE_TIMEOUT_MS });
    const obj = res && typeof res === 'object' ? res as Record<string, unknown> : {};
    const isA = obj.isAnomaly ?? (obj.result as Record<string, unknown>|undefined)?.isAnomaly ?? (obj.outputs as Record<string, unknown>|undefined)?.isAnomaly;
    const aS = obj.anomalyScore ?? (obj.result as Record<string, unknown>|undefined)?.anomalyScore ?? (obj.outputs as Record<string, unknown>|undefined)?.anomalyScore;
    const isAnomaly = typeof isA === 'number' && !isNaN(isA) ? isA : 1;
    const anomalyScore = typeof aS === 'number' && !isNaN(aS) ? aS : 0;
    return { isAnomaly, anomalyScore };
  }

  /** Try common Azure ML response shapes: predictions, result, outputs, etc. */
  private extractNumber(obj: unknown): number | undefined {
    if (obj == null) return undefined;
    if (typeof obj === 'number' && !isNaN(obj)) return obj;
    if (typeof obj !== 'object') return undefined;

    const o = obj as Record<string, unknown>;
    const arr = (o.predictions ?? o.result ?? o.Results ?? o.values) as unknown;
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'number') return first;
      if (Array.isArray(first) && first.length > 0 && typeof first[0] === 'number') return first[0];
    }
    const outputs = o.outputs as Record<string, unknown> | undefined;
    if (outputs?.predictions) {
      const p = (outputs.predictions as unknown[])?.[0];
      if (typeof p === 'number') return p;
    }
    // Shallow scan for first number
    for (const v of Object.values(o)) {
      if (typeof v === 'number' && !isNaN(v)) return v;
      if (Array.isArray(v) && v.length > 0) {
        const n = this.extractNumber(v[0]);
        if (n != null) return n;
      }
    }
    return undefined;
  }
}
