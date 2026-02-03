import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface AnalyticsServiceConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string; containers?: Record<string, string> };
  services: {
    shard_manager?: { url: string };
    logging?: { url: string };
    user_management?: { url: string };
    ai_service?: { url: string };
    ml_service?: { url: string };
    integration_manager?: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string; bindings?: string[] };
}

export function loadConfig(): AnalyticsServiceConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as AnalyticsServiceConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  return config;
}

