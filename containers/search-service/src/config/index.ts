import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface SearchServiceConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string; containers?: Record<string, string> };
  /** Field-weighted relevance (MISSING_FEATURES 2.3): name > description > metadata */
  field_weights?: { name?: number; description?: number; metadata?: number };
  /** Additive boost to vector score from field-weighted keyword match; 0 = disabled */
  field_weight_boost?: number;
  services: {
    embeddings?: { url: string };
    shard_manager?: { url: string };
    logging?: { url: string };
    ai_service?: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
}

export function loadConfig(): SearchServiceConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as SearchServiceConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  return config;
}

