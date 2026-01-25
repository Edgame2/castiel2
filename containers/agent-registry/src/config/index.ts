/**
 * Configuration loader for agent-registry module
 * Per ModuleImplementationGuide Section 4.4
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface AgentRegistryConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string; containers?: Record<string, string> };
  services: {
    ai_service: { url: string };
    prompt_service: { url: string };
    quality: { url: string };
    observability: { url: string };
    logging: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
}

let cachedConfig: AgentRegistryConfig | null = null;

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
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
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}

/**
 * Resolve environment variables in config values
 * Supports ${VAR:-default} syntax
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const [varName, defaultValue] = expression.split(':-');
      const envValue = process.env[varName];
      if (envValue !== undefined) {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return match;
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = resolveEnvVars(obj[key]);
    }
    return result;
  }
  
  return obj;
}

/**
 * Load and validate configuration
 */
export function loadConfig(): AgentRegistryConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');
  
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as AgentRegistryConfig;
  
  let envConfig: Partial<AgentRegistryConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<AgentRegistryConfig>;
  }
  
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
  }
  
  const config = deepMerge(defaultConfig, envConfig);
  const resolved = resolveEnvVars(config) as AgentRegistryConfig;
  
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }
  
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }
  
  // Additional runtime validations
  if (!resolved.cosmos_db.endpoint || !resolved.cosmos_db.key) {
    throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables are required');
  }
  
  if (!resolved.rabbitmq.url) {
    throw new Error('RABBITMQ_URL environment variable is required');
  }
  
  cachedConfig = resolved;
  return cachedConfig;
}
