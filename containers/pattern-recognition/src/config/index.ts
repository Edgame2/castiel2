import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface PatternRecognitionConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: { endpoint: string; key: string; database_id: string; containers?: Record<string, string> };
  services: {
    context_service: { url: string };
    embeddings: { url: string };
    knowledge_base: { url: string };
    quality: { url: string };
    logging: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
}

export function loadConfig(): PatternRecognitionConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as PatternRecognitionConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  config.server.host = process.env.HOST || (config.server.host?.startsWith('${') ? '0.0.0.0' : config.server.host) || '0.0.0.0';
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  if (process.env.RABBITMQ_URL) config.rabbitmq.url = process.env.RABBITMQ_URL;
  return config;
}

