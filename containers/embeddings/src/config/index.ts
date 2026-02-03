import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface EmbeddingsConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers?: Record<string, string>;
  };
  services: {
    ai_service?: { url: string };
    logging?: { url: string };
    shard_manager?: { url: string };
  };
  rabbitmq?: { url?: string; exchange?: string; queue?: string };
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
}

export function loadConfig(): EmbeddingsConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as EmbeddingsConfig;
  
  // Override with environment variables if provided
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.COSMOS_DB_ENDPOINT) config.cosmos_db.endpoint = process.env.COSMOS_DB_ENDPOINT;
  if (process.env.COSMOS_DB_KEY) config.cosmos_db.key = process.env.COSMOS_DB_KEY;
  if (process.env.COSMOS_DB_DATABASE_ID) config.cosmos_db.database_id = process.env.COSMOS_DB_DATABASE_ID;
  if (process.env.AI_SERVICE_URL) {
    config.services.ai_service = { url: process.env.AI_SERVICE_URL };
  }
  if (process.env.LOGGING_URL) {
    config.services.logging = { url: process.env.LOGGING_URL };
  }
  if (process.env.SHARD_MANAGER_URL) {
    config.services.shard_manager = { url: process.env.SHARD_MANAGER_URL };
  }
  if (process.env.RABBITMQ_URL && config.rabbitmq) config.rabbitmq.url = process.env.RABBITMQ_URL;
  if (process.env.REDIS_URL) config.redis.url = process.env.REDIS_URL;
  if (process.env.REDIS_HOST) config.redis.host = process.env.REDIS_HOST;
  if (process.env.REDIS_PORT) config.redis.port = parseInt(process.env.REDIS_PORT, 10);
  if (process.env.REDIS_PASSWORD) config.redis.password = process.env.REDIS_PASSWORD;
  if (process.env.REDIS_DB) config.redis.db = parseInt(process.env.REDIS_DB, 10);
  
  return config;
}

