/**
 * Configuration Loader
 * Per ModuleImplementationGuide Section 4.4
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { UserManagementConfig } from '../types/config.types';
import { log } from '../utils/logger';

let cachedConfig: UserManagementConfig | null = null;

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
export function loadConfig(): UserManagementConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');
  
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as UserManagementConfig;
  
  let envConfig: Partial<UserManagementConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<UserManagementConfig>;
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
  const resolved = resolveEnvVars(config) as UserManagementConfig;
  
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }
  const toBool = (v: unknown) => (v === true || v === 'true' || v === '1');
  const toInt = (v: unknown) => (typeof v === 'number' ? v : parseInt(String(v), 10));
  if (resolved.features) {
    if (resolved.features.user_profiles !== undefined) resolved.features.user_profiles = toBool(resolved.features.user_profiles);
    if (resolved.features.teams !== undefined) resolved.features.teams = toBool(resolved.features.teams);
    if (resolved.features.rbac !== undefined) resolved.features.rbac = toBool(resolved.features.rbac);
    if (resolved.features.invitations !== undefined) resolved.features.invitations = toBool(resolved.features.invitations);
    if (resolved.features.user_analytics !== undefined) resolved.features.user_analytics = toBool(resolved.features.user_analytics);
  }
  if (resolved.team) {
    if (resolved.team.max_members !== undefined) resolved.team.max_members = toInt(resolved.team.max_members);
    if (resolved.team.max_teams_per_tenant !== undefined) resolved.team.max_teams_per_tenant = toInt(resolved.team.max_teams_per_tenant);
  }
  if (resolved.invitation) {
    if (resolved.invitation.expiration_days !== undefined) resolved.invitation.expiration_days = toInt(resolved.invitation.expiration_days);
    if (resolved.invitation.max_pending_per_tenant !== undefined) resolved.invitation.max_pending_per_tenant = toInt(resolved.invitation.max_pending_per_tenant);
  }
  
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }
  
  // Additional runtime validations for critical configuration
  if (!resolved.database.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  if (!resolved.jwt.secret || resolved.jwt.secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    log.warn('JWT_SECRET is using default value. This should be changed in production.', { service: 'user-management' });
  }
  
  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event publishing will be disabled.', { service: 'user-management' });
  }
  
  cachedConfig = resolved;
  return resolved;
}

/**
 * Get the current config (throws if not loaded)
 */
export function getConfig(): UserManagementConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

/**
 * Clear cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

