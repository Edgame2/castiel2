/**
 * Configuration loader
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

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
  services: Record<string, { url: string }>;
  rate_limit?: {
    max: number;
    timeWindow: number;
  };
  circuit_breaker?: {
    threshold: number;
    timeout: number;
  };
}

export function loadConfig(): GatewayConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const configFile = readFileSync(configPath, 'utf-8');
  const config = parse(configFile) as GatewayConfig;
  
  // Apply environment variable overrides
  if (process.env.PORT) {
    config.server.port = parseInt(process.env.PORT, 10);
  }
  if (process.env.HOST) {
    config.server.host = process.env.HOST;
  }
  if (process.env.JWT_SECRET) {
    config.jwt.secret = process.env.JWT_SECRET;
  }

  return config;
}

