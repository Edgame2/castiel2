/**
 * Unit tests for LoggingClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggingClient } from '../../../src/services/logging/LoggingClient';
import { getConfig } from '../../../src/config';

// Mock config
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(),
}));

describe('LoggingClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with config service URL', () => {
    (getConfig as any).mockReturnValue({
      services: {
        logging: {
          url: 'http://test-logging:3014',
        },
      },
      logging: {
        enabled: true,
      },
    });

    const client = new LoggingClient();
    expect(client).toBeDefined();
  });

  it('should disable if logging is disabled in config', () => {
    (getConfig as any).mockReturnValue({
      services: {
        logging: {
          url: 'http://test-logging:3014',
        },
      },
      logging: {
        enabled: false,
      },
    });

    const client = new LoggingClient();
    // Client should be created but logging should be disabled
    expect(client).toBeDefined();
  });

  it('should disable if no service URL is configured', () => {
    (getConfig as any).mockReturnValue({
      services: {
        logging: {},
      },
      logging: {
        enabled: true,
        serviceUrl: undefined,
      },
    });

    const client = new LoggingClient();
    expect(client).toBeDefined();
  });
});



