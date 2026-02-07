/**
 * Configuration loader for learning-service module (Plan W6 Layer 7 – Feedback Loop)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { log } from '../utils/logger.js';

export interface LearningServiceConfig extends Record<string, unknown> {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: { user_feedback: string; outcome: string };
  };
  jwt: { secret: string };
  services: { [key: string]: { url: string } };
  rabbitmq: { url: string; exchange: string; queue: string; bindings: string[] };
}

let cachedConfig: LearningServiceConfig | null = null;

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (sourceValue !== undefined) {
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key as string] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key as string] = sourceValue;
      }
    }
  }
  return result;
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_match, expression: string) => {
      const [varName, defaultValue] = expression.split(':-');
      return process.env[varName] ?? defaultValue ?? _match;
    });
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) result[key] = resolveEnvVars(record[key]);
    return result;
  }
  return obj;
}

export function loadConfig(): LearningServiceConfig {
  if (cachedConfig) return cachedConfig;

  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');

  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }

  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as LearningServiceConfig;
  let envConfig: Partial<LearningServiceConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<LearningServiceConfig>;
  }

  const schemaPath = join(configDir, 'schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;

  const config = deepMerge(defaultConfig, envConfig);
  const resolved = resolveEnvVars(config) as LearningServiceConfig;

  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }

  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);

  if (!validate(resolved as unknown)) {
    const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }

  if (!resolved.cosmos_db.endpoint || !resolved.cosmos_db.key) {
    throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables are required');
  }

  if (!resolved.jwt.secret || resolved.jwt.secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    log.warn('JWT_SECRET is using default value', { service: 'learning-service' });
  }

  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event publishing will be disabled.', { service: 'learning-service' });
  }

  cachedConfig = resolved;
  return resolved;
}

export function getConfig(): LearningServiceConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
