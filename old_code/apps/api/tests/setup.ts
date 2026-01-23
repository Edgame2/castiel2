/**
 * Global test setup file for main-api tests
 * 
 * This file runs before all tests and sets up:
 * - Environment variables
 * - Global mocks
 * - Test database connection (if needed)
 */

import { beforeAll, afterAll, vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for tests, preferring project .env
// Order: root .env → root .env.local → app .env → tests .env.test (overrides if present)
const rootDir = path.resolve(__dirname, '../../..');
const appDir = path.resolve(__dirname, '..');

// Root .env
dotenv.config({ path: path.join(rootDir, '.env') });
// Root .env.local
dotenv.config({ path: path.join(rootDir, '.env.local') });
// App-level .env (apps/api/.env)
dotenv.config({ path: path.join(appDir, '.env') });
// Test-specific overrides (optional)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set default test environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
process.env.MONITORING_ENABLED = process.env.MONITORING_ENABLED || 'false';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment for main-api...');
});

// Global test teardown
afterAll(async () => {
  console.log('✅ Test environment cleanup complete');
});

// Mock console methods in tests (optional)
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error,
};
