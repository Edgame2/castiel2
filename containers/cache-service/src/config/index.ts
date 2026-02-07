import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

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

export function loadConfig(): CacheServiceConfig {
  const configPath = join(__dirname, '../../config/default.yaml');
  const raw = parseYaml(readFileSync(configPath, 'utf-8')) as CacheServiceConfig;
  const config = resolveEnvVars(raw) as CacheServiceConfig;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT, 10);
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.REDIS_URL && config.redis) config.redis.url = process.env.REDIS_URL;
  return config;
}

