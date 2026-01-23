/**
 * Configuration Helper
 * Provides centralized access to configuration values
 * Falls back to process.env if ConfigurationService is not available
 * 
 * Usage:
 *   import { getConfigValue, getRequiredConfigValue } from '../config/config-helper.js';
 *   const endpoint = getConfigValue('cosmosDb.endpoint', 'default-value');
 *   const requiredKey = getRequiredConfigValue('cosmosDb.key');
 */

import type { ConfigurationService } from '../services/configuration.service.js';
import type { FastifyInstance } from 'fastify';

let globalConfigurationService: ConfigurationService | undefined;

/**
 * Set the global configuration service instance
 */
export function setConfigurationService(service: ConfigurationService): void {
  globalConfigurationService = service;
}

/**
 * Get ConfigurationService from Fastify server decoration
 * Useful in route handlers and service initialization
 */
export function getConfigurationServiceFromServer(server: FastifyInstance): ConfigurationService | undefined {
  return (server as any).configurationService;
}

/**
 * Get a configuration value
 * Uses ConfigurationService if available, otherwise falls back to process.env
 * 
 * @param key - Configuration key (supports dot notation for nested values like 'cosmosDb.endpoint')
 * @param defaultValue - Optional default value if key is not found
 * @returns Configuration value or default
 * 
 * @example
 *   const endpoint = getConfigValue('cosmosDb.endpoint', 'https://default.cosmos.azure.com');
 *   const port = getConfigValue('port', 3001);
 */
export function getConfigValue(key: string, defaultValue?: any): any {
  if (globalConfigurationService) {
    try {
      return globalConfigurationService.getValue(key, defaultValue);
    } catch (error) {
      // If config not loaded, fall back to process.env
    }
  }
  
  // Fallback to process.env
  // Convert dot notation to env var format (e.g., 'cosmosDb.endpoint' -> 'COSMOS_DB_ENDPOINT')
  const envKey = key
    .split('.')
    .map(part => part.replace(/([A-Z])/g, '_$1').toUpperCase())
    .join('_');
  const envValue = process.env[envKey];
  return envValue !== undefined ? envValue : defaultValue;
}

/**
 * Get a required configuration value (throws if missing)
 * 
 * @param key - Configuration key (supports dot notation for nested values)
 * @returns Configuration value
 * @throws Error if value is missing
 * 
 * @example
 *   const endpoint = getRequiredConfigValue('cosmosDb.endpoint');
 */
export function getRequiredConfigValue(key: string): any {
  if (globalConfigurationService) {
    try {
      return globalConfigurationService.getRequiredValue(key);
    } catch (error) {
      // If config not loaded, fall back to process.env
    }
  }
  
  // Fallback to process.env
  const envKey = key
    .split('.')
    .map(part => part.replace(/([A-Z])/g, '_$1').toUpperCase())
    .join('_');
  const envValue = process.env[envKey];
  if (envValue === undefined || envValue === null) {
    throw new Error(`Required configuration missing: ${key} (env: ${envKey})`);
  }
  return envValue;
}

/**
 * Check if configuration service is available
 */
export function hasConfigurationService(): boolean {
  return !!globalConfigurationService;
}

/**
 * Get the global ConfigurationService instance (if set)
 */
export function getConfigurationService(): ConfigurationService | undefined {
  return globalConfigurationService;
}
