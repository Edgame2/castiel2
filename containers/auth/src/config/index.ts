/**
 * Configuration Loader
 * Per ModuleImplementationGuide Section 4.4
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AuthConfig } from '../types/config.types';
import { log } from '../utils/logger';

let cachedConfig: AuthConfig | null = null;

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
    // Match ${VAR:-default} or ${VAR}
    return obj.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const [varName, defaultValue] = expression.split(':-');
      const envValue = process.env[varName];
      if (envValue !== undefined) {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return match; // Return original if no value found
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
export function loadConfig(): AuthConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const env = process.env.NODE_ENV || 'development';
  
  // Resolve config directory
  const configDir = join(__dirname, '../../config');
  
  // Load default config
  const defaultPath = join(configDir, 'default.yaml');
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as AuthConfig;
  
  // Load environment-specific overrides
  let envConfig: Partial<AuthConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<AuthConfig>;
  }
  
  // Load schema for validation
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
  }
  
  // Merge configs
  const config = deepMerge(defaultConfig, envConfig);
  
  // Resolve environment variables
  const resolved = resolveEnvVars(config) as AuthConfig;
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }
  const toBool = (v: unknown) => (typeof v === 'string' ? v === 'true' : v);
  const toInt = (v: unknown) => (typeof v === 'string' ? parseInt(v, 10) : v);
  if (resolved.oauth?.google) resolved.oauth.google.enabled = toBool(resolved.oauth.google.enabled) as boolean;
  if (resolved.oauth?.github) resolved.oauth.github.enabled = toBool(resolved.oauth.github.enabled) as boolean;
  if (resolved.sso) {
    resolved.sso.enabled = toBool(resolved.sso.enabled) as boolean;
    if (resolved.sso.saml) resolved.sso.saml.enabled = toBool(resolved.sso.saml.enabled) as boolean;
  }
  if (resolved.session) {
    resolved.session.max_sessions_per_user = toInt(resolved.session.max_sessions_per_user) as number;
    resolved.session.session_timeout = toInt(resolved.session.session_timeout) as number;
    resolved.session.cleanup_interval = toInt(resolved.session.cleanup_interval) as number;
  }
  if (resolved.password) {
    resolved.password.min_length = toInt(resolved.password.min_length) as number;
    resolved.password.require_uppercase = toBool(resolved.password.require_uppercase) as boolean;
    resolved.password.require_lowercase = toBool(resolved.password.require_lowercase) as boolean;
    resolved.password.require_numbers = toBool(resolved.password.require_numbers) as boolean;
    resolved.password.require_symbols = toBool(resolved.password.require_symbols) as boolean;
    resolved.password.history_count = toInt(resolved.password.history_count) as number;
    resolved.password.max_age_days = toInt(resolved.password.max_age_days) as number;
  }
  if (resolved.security) {
    resolved.security.max_login_attempts = toInt(resolved.security.max_login_attempts) as number;
    resolved.security.lockout_duration_ms = toInt(resolved.security.lockout_duration_ms) as number;
    resolved.security.require_email_verification = toBool(resolved.security.require_email_verification) as boolean;
  }
  if (resolved.features) {
    resolved.features.oauth_google = toBool(resolved.features.oauth_google) as boolean;
    resolved.features.oauth_github = toBool(resolved.features.oauth_github) as boolean;
    resolved.features.saml_sso = toBool(resolved.features.saml_sso) as boolean;
    resolved.features.password_reset = toBool(resolved.features.password_reset) as boolean;
    resolved.features.email_verification = toBool(resolved.features.email_verification) as boolean;
    resolved.features.multi_factor_auth = toBool(resolved.features.multi_factor_auth) as boolean;
    resolved.features.api_keys = toBool(resolved.features.api_keys) as boolean;
  }
  if (resolved.rate_limit) {
    resolved.rate_limit.enabled = toBool(resolved.rate_limit.enabled) as boolean;
    resolved.rate_limit.window_seconds = toInt(resolved.rate_limit.window_seconds) as number;
    resolved.rate_limit.max_per_window = toInt(resolved.rate_limit.max_per_window) as number;
  }

  // Validate against schema
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
    log.warn('JWT_SECRET is using default value. This should be changed in production.', { service: 'auth' });
  }
  
  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event publishing will be disabled.', { service: 'auth' });
  }
  
  cachedConfig = resolved;
  return resolved;
}

/**
 * Get the current config (throws if not loaded)
 */
export function getConfig(): AuthConfig {
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

