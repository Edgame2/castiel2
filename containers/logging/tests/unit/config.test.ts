/**
 * Configuration Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock yaml parser with proper function
const mockParse = vi.fn();
vi.mock('yaml', () => ({
  parse: mockParse,
}));

describe('Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache
    vi.resetModules();
  });

  it('should load default configuration', async () => {
    const mockConfig = {
      module: { name: 'logging', version: '1.0.0' },
      server: { port: 3014, host: '0.0.0.0' },
      database: { url: 'postgresql://localhost:5432/logging', pool_size: 20 },
      rabbitmq: {
        url: 'amqp://localhost:5672',
        exchange: 'coder_events',
        queue: 'logging_service',
        bindings: [],
      },
      storage: { provider: 'postgres', postgres: { partition_by: 'month' } },
      defaults: {
        capture: { ip_address: true, user_agent: true, geolocation: false },
        redaction: { enabled: true, patterns: [] },
        retention: { default_days: 90, min_days: 30, max_days: 365 },
        hash_chain: { enabled: true, algorithm: 'sha256' },
        alerts: { enabled: true, check_interval_seconds: 60 },
      },
      ingestion: { batch_size: 100, flush_interval_ms: 1000, buffer: { enabled: true, max_size: 10000, file_path: '/tmp/buffer' } },
      rate_limit: { enabled: true, max_per_second: 1000, burst: 2000 },
      jobs: {
        retention: { enabled: true, schedule: '0 2 * * *' },
        archive: { enabled: true, schedule: '0 3 * * *' },
        alerts: { enabled: true, schedule: '*/1 * * * *' },
        partition: { enabled: true, schedule: '0 0 25 * *' },
      },
    };
    
    const schemaContent = JSON.stringify({
      type: 'object',
      required: ['module'],
      properties: {
        module: { type: 'object', properties: { name: { type: 'string' } } },
      },
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation((path: any) => {
      if (path.toString().includes('schema.json')) {
        return schemaContent;
      }
      return 'dummy yaml content';
    });
    mockParse.mockReturnValue(mockConfig);

    // Import fresh config module
    const { loadConfig, clearConfigCache } = await import('../../src/config');
    clearConfigCache();

    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.module.name).toBe('logging');
  });
});

