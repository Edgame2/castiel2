import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'yaml';

export interface AIInsightsConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string };
  services: {
    ai_service: { url: string };
    shard_manager: { url: string };
    embeddings: { url: string };
    logging: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
}

export function loadConfig(): AIInsightsConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = load(readFileSync(configPath, 'utf-8')) as AIInsightsConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  return config;
}

