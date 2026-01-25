import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'yaml';

export interface CacheServiceConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    ttl?: number;
  };
  cosmos_db?: {
    endpoint?: string;
    key?: string;
    database_id?: string;
    containers?: {
      metrics?: string;
      strategies?: string;
    };
  };
  jwt?: {
    secret?: string;
  };
  services: {
    logging?: { url: string };
    embeddings?: { url: string };
  };
  rabbitmq: { url: string; exchange: string; queue: string };
}

export function loadConfig(): CacheServiceConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const config = load(readFileSync(configPath, 'utf-8')) as CacheServiceConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.REDIS_URL) config.cache.url = process.env.REDIS_URL;
  return config;
}

