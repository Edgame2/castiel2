/**
 * Test setup for llm-service
 */
import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
vi.stubEnv('NODE_ENV', 'test');
