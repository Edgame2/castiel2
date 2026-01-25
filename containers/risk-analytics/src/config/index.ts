/**
 * Configuration loader for risk-analytics module
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { log } from '../utils/logger';

export interface RiskAnalyticsConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: {
      evaluations: string;
      snapshots?: string;
      predictions?: string;
      revenue_at_risk: string;
      quotas: string;
      warnings: string;
      simulations: string;
      anomaly_alerts?: string;
      sentiment_trends?: string;
      clusters?: string;
      association_rules?: string;
      account_health?: string;
    };
  };
  data_lake?: {
    connection_string: string;
    container: string;
    path_prefix: string;
    ml_outcomes_prefix?: string;
  };
  outcome_sync?: {
    tenant_ids: string[];
    shard_type_name?: string;
  };
  outcome_feedback?: {
    publish_on_shard_update?: boolean;
  };
  jwt: { secret: string };
  services: { [key: string]: { url: string } };
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
    bindings: string[];
    batch_jobs?: { queue: string; routing_keys: string[] };
  };
  auto_evaluation?: {
    enabled?: boolean;
    trigger_on_shard_update?: boolean;
    trigger_on_opportunity_update?: boolean;
    trigger_on_risk_catalog_update?: boolean;
    max_reevaluations_per_catalog_event?: number;
  };
  features?: { [key: string]: boolean };
  feature_flags?: {
    early_warning_lstm?: boolean;
    industry_models?: boolean;
    competitive_intelligence?: boolean;
    anomaly_detection?: boolean;
    prescriptive_remediation?: boolean;
    executive_dashboards?: boolean;
    hitl_approvals?: boolean;
  };
  thresholds?: {
    early_warning_days_inactivity?: number[];
    risk_velocity_alert?: number;
    hitl_risk_min?: number;
    hitl_deal_min?: number;
  };
  /** Plan §11.11, §944: reason -> playbook/action id or label for top-at-risk-reasons */
  at_risk_reasons_mitigation?: Record<string, string>;
  application_insights?: { connection_string: string; disable: boolean };
  metrics?: { path: string; require_auth: boolean; bearer_token: string };
}

let cachedConfig: RiskAnalyticsConfig | null = null;

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (sourceValue !== undefined) {
      if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
          typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  return result;
}

function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const [varName, defaultValue] = expression.split(':-');
      return process.env[varName] || defaultValue || match;
    });
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {};
    for (const key in obj) result[key] = resolveEnvVars(obj[key]);
    return result;
  }
  return obj;
}

export function loadConfig(): RiskAnalyticsConfig {
  if (cachedConfig) return cachedConfig;
  
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');
  
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as RiskAnalyticsConfig;
  let envConfig: Partial<RiskAnalyticsConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<RiskAnalyticsConfig>;
  }
  
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load schema: ${error}`);
  }
  
  const config = deepMerge(defaultConfig, envConfig);
  const resolved = resolveEnvVars(config) as RiskAnalyticsConfig;

  resolved.application_insights = resolved.application_insights ?? { connection_string: '', disable: true };
  resolved.metrics = resolved.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
  if (typeof resolved.application_insights.disable === 'string') {
    resolved.application_insights.disable = resolved.application_insights.disable === 'true';
  }
  if (typeof resolved.metrics.require_auth === 'string') {
    resolved.metrics.require_auth = resolved.metrics.require_auth === 'true';
  }
  
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }

  // Plan §8.1: coerce feature_flags "true"/"false" strings to boolean
  if (resolved.feature_flags && typeof resolved.feature_flags === 'object') {
    const ff = resolved.feature_flags as Record<string, unknown>;
    for (const k of Object.keys(ff)) {
      if (ff[k] === 'true') ff[k] = true;
      if (ff[k] === 'false') ff[k] = false;
    }
  }
  // Plan §8.1: coerce thresholds numeric fields from env strings
  if (resolved.thresholds && typeof resolved.thresholds === 'object') {
    const t = resolved.thresholds as Record<string, unknown>;
    if (typeof t.risk_velocity_alert === 'string') t.risk_velocity_alert = parseFloat(t.risk_velocity_alert);
    if (typeof t.hitl_risk_min === 'string') t.hitl_risk_min = parseFloat(t.hitl_risk_min);
    if (typeof t.hitl_deal_min === 'string') t.hitl_deal_min = parseFloat(t.hitl_deal_min);
    if (Array.isArray(t.early_warning_days_inactivity)) {
      t.early_warning_days_inactivity = t.early_warning_days_inactivity.map((v: unknown) =>
        typeof v === 'string' ? parseFloat(v) : v
      );
    }
  }

  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }
  
  if (!resolved.cosmos_db.endpoint || !resolved.cosmos_db.key) {
    throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables are required');
  }
  
  if (!resolved.jwt.secret || resolved.jwt.secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    log.warn('JWT_SECRET is using default value', { service: 'risk-analytics' });
  }
  
  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event publishing will be disabled.', { service: 'risk-analytics' });
  }
  
  cachedConfig = resolved;
  return resolved;
}

export function getConfig(): RiskAnalyticsConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
