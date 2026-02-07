/**
 * Configuration loader
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface ShardManagerConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
  };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers?: {
      shards?: string;
      shard_types?: string;
      relationships?: string;
    };
  };
  services: {
    logging: { url: string };
    user_management: { url: string };
  };
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
  };
  bootstrap?: {
    enabled?: boolean;
    tenant_id?: string;
    created_by?: string;
    ensure_cosmos_containers?: boolean;
    cosmos_containers_manifest_path?: string;
  };
}

export function loadConfig(): ShardManagerConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const configFile = readFileSync(configPath, 'utf-8');
  const config = parseYaml(configFile) as ShardManagerConfig;
  
  // Apply environment variable overrides
  if (process.env.PORT) {
    config.server.port = parseInt(process.env.PORT, 10);
  }
  config.server.host = process.env.HOST || (config.server.host?.startsWith('${') ? '0.0.0.0' : config.server.host) || '0.0.0.0';
  if (process.env.COSMOS_DB_ENDPOINT) {
    config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  }
  if (process.env.COSMOS_DB_KEY) {
    config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  }
  if (process.env.RABBITMQ_URL) config.rabbitmq.url = process.env.RABBITMQ_URL;

  return config;
}

