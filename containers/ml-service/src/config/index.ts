import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface MLServiceConfig {
  module: { name: string; version: string };
  application_insights?: { connection_string?: string; disable?: boolean };
  metrics?: { path?: string; require_auth?: boolean; bearer_token?: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string; containers?: Record<string, string> };
  services: {
    ai_service?: { url: string };
    embeddings?: { url: string };
    logging?: { url: string };
    context_service?: { url: string };
    adaptive_learning?: { url: string };
    shard_manager?: { url: string };
    risk_analytics?: { url: string };
    risk_catalog?: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
  feature_pipeline?: { stage_labels?: string[]; industry_labels?: string[] };
  feature_flags?: { use_win_probability_ml?: boolean; use_risk_scoring_ml?: boolean; use_revenue_forecasting_ml?: boolean; [k: string]: boolean | undefined };
  features?: { [key: string]: boolean };
  azure_ml?: {
    workspace_name?: string;
    resource_group?: string;
    subscription_id?: string;
    endpoints?: Record<string, string>;
    api_key?: string;
  };
  /** Plan §978: ONNX/Redis when p95≥500ms; performance-optimization.md. Used when implemented. */
  onnx?: { enabled?: boolean; model_path?: string };
  cache?: { redis?: { enabled?: boolean; url?: string; ttl_seconds?: number } };
  /** Plan §940, §9.3: model-monitoring thresholds; model-monitoring runbook */
  model_monitoring?: { brier_threshold?: number; psi_threshold?: number; mae_threshold?: number };
  /** Super Admin §5.2.2: feature version policy (versioning strategy, backward compatibility, deprecation). */
  feature_version_policy?: {
    versioningStrategy?: 'semantic' | 'timestamp' | 'hash';
    backwardCompatibility?: {
      enforceCompatibility?: boolean;
      allowBreakingChanges?: boolean;
      requireMigrationGuide?: boolean;
    };
    deprecationPolicy?: {
      deprecationNoticeDays?: number;
      supportOldVersionsDays?: number;
      autoMigrate?: boolean;
    };
  };
  /** Super Admin §5.3.2: default quality rules (missing rate, drift, outlier method). Applied when no per-feature override. */
  feature_quality_rules?: {
    missingRateThreshold?: number;
    driftThreshold?: number;
    outlierMethod?: 'iqr' | 'zscore' | 'isolation_forest';
    outlierNStd?: number;
  };
  /** Plan §9.3, §11.3: read /ml_inference_logs for PSI when implemented. Writer: logging DataLakeCollector. */
  data_lake?: { connection_string?: string; container?: string; ml_inference_logs_prefix?: string };
}

export function loadConfig(): MLServiceConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as MLServiceConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  config.server.host = process.env.HOST || (config.server.host?.startsWith('${') ? '0.0.0.0' : config.server.host) || '0.0.0.0';
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  if (process.env.RABBITMQ_URL) config.rabbitmq.url = process.env.RABBITMQ_URL;
  config.features = config.features || {};
  config.feature_flags = config.feature_flags || {};
  if (process.env.USE_WIN_PROBABILITY_ML !== undefined) config.feature_flags.use_win_probability_ml = process.env.USE_WIN_PROBABILITY_ML === 'true';
  if (process.env.USE_RISK_SCORING_ML !== undefined) config.feature_flags.use_risk_scoring_ml = process.env.USE_RISK_SCORING_ML === 'true';
  if (process.env.USE_REVENUE_FORECASTING_ML !== undefined) config.feature_flags.use_revenue_forecasting_ml = process.env.USE_REVENUE_FORECASTING_ML === 'true';

  config.azure_ml = config.azure_ml || { endpoints: {}, api_key: '' };
  config.azure_ml.workspace_name = process.env.AZURE_ML_WORKSPACE_NAME ?? config.azure_ml.workspace_name ?? '';
  config.azure_ml.resource_group = process.env.AZURE_ML_RESOURCE_GROUP ?? config.azure_ml.resource_group ?? 'castiel-ml-prod-rg';
  config.azure_ml.subscription_id = process.env.AZURE_ML_SUBSCRIPTION_ID ?? config.azure_ml.subscription_id ?? '';
  const ep = { ...(config.azure_ml.endpoints || {}) };
  const set = (k: string, v: string | undefined) => { if (v) ep[k] = v; };
  set('risk_scoring_global', process.env.AZURE_ML_ENDPOINT_RISK_GLOBAL);
  set('risk_scoring_industry', process.env.AZURE_ML_ENDPOINT_RISK_INDUSTRY);
  set('risk_trajectory_lstm', process.env.AZURE_ML_ENDPOINT_LSTM);
  set('win_probability', process.env.AZURE_ML_ENDPOINT_WIN_PROB);
  set('revenue_forecasting', process.env.AZURE_ML_ENDPOINT_FORECAST);
  set('clustering', process.env.AZURE_ML_ENDPOINT_CLUSTERING);
  set('propagation', process.env.AZURE_ML_ENDPOINT_PROPAGATION);
  set('anomaly', process.env.AZURE_ML_ENDPOINT_ANOMALY);
  set('mitigation_ranking', process.env.AZURE_ML_ENDPOINT_MITIGATION);
  set('win-probability-model', process.env.AZURE_ML_WIN_PROBABILITY_URL || process.env.AZURE_ML_ENDPOINT_WIN_PROB);
  set('risk-scoring-model', process.env.AZURE_ML_RISK_SCORING_URL || process.env.AZURE_ML_ENDPOINT_RISK_GLOBAL);
  config.azure_ml.endpoints = ep;
  if (process.env.AZURE_ML_API_KEY) config.azure_ml.api_key = process.env.AZURE_ML_API_KEY;
  return config;
}
