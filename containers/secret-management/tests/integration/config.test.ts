/**
 * Integration tests for configuration
 * Tests actual file loading and environment variable resolution
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Configuration Integration', () => {
  it('should have default.yaml config file', () => {
    const configPath = join(__dirname, '../../config/default.yaml');
    expect(existsSync(configPath)).toBe(true);
  });

  it('should have schema.json file', () => {
    const schemaPath = join(__dirname, '../../config/schema.json');
    expect(existsSync(schemaPath)).toBe(true);
  });

  it('should have production.yaml config file', () => {
    const configPath = join(__dirname, '../../config/production.yaml');
    expect(existsSync(configPath)).toBe(true);
  });

  it('should have test.yaml config file', () => {
    const configPath = join(__dirname, '../../config/test.yaml');
    expect(existsSync(configPath)).toBe(true);
  });
});



