/**
 * Configuration loader
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^:}]+)(?::-([^}]*))?\}/g, (_m, name: string, def: string) =>
      process.env[name] ?? def ?? ''
    );
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveEnvVars(v);
    return out;
  }
  return obj;
}

export interface GatewayConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
  };
  jwt: {
    secret: string;
  };
  services: Record<string, { url: string }> & {
    ai_conversation?: { url: string };
    multi_modal_service?: { url: string };
    prompt_service?: { url: string };
  };
  rate_limit?: {
    max: number;
    timeWindow: number;
  };
  circuit_breaker?: {
    threshold: number;
    timeout: number;
  };
  cors?: {
    origin: string;
  };
  redis?: {
    url: string;
  };
}

export function loadConfig(): GatewayConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const configFile = readFileSync(configPath, 'utf-8');
  const raw = parse(configFile) as GatewayConfig;
  const config = resolveEnvVars(raw) as GatewayConfig;
  config.server.port = typeof config.server.port === 'string' ? parseInt(config.server.port, 10) : config.server.port;
  if (config.rate_limit?.timeWindow && typeof config.rate_limit.timeWindow === 'string') {
    config.rate_limit.timeWindow = parseInt(config.rate_limit.timeWindow, 10);
  }
  if (config.circuit_breaker) {
    if (typeof config.circuit_breaker.threshold === 'string') {
      config.circuit_breaker.threshold = parseInt(config.circuit_breaker.threshold, 10);
    }
    if (typeof config.circuit_breaker.timeout === 'string') {
      config.circuit_breaker.timeout = parseInt(config.circuit_breaker.timeout, 10);
    }
  }
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.JWT_SECRET) config.jwt.secret = process.env.JWT_SECRET;
  return config;
}

