/**
 * Local Buffer Utility Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditLog, LogCategory, LogSeverity } from '../../../src/types';
import { promises as fs } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    appendFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock config module
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(() => ({
    ingestion: {
      buffer: {
        file_path: '/tmp/test_buffer',
        max_size: 100,
      },
    },
  })),
}));

// Import after mocks
import { LocalBuffer } from '../../../src/utils/buffer';

describe('LocalBuffer', () => {
  let buffer: LocalBuffer;
  const testFilePath = '/tmp/test_buffer';

  beforeEach(() => {
    buffer = new LocalBuffer(testFilePath, 100);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('add', () => {
    it('should add a log to buffer', async () => {
      const log: AuditLog = {
        id: 'log-1',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        receivedAt: new Date(),
        action: 'user.login',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
        message: 'User logged in',
        hash: 'hash-1',
        createdAt: new Date(),
        userId: null,
        sessionId: null,
        ipAddress: null,
        userAgent: null,
        geolocation: null,
        resourceType: null,
        resourceId: null,
        metadata: {},
        previousHash: null,
        source: 'api',
        correlationId: null,
      };

      await buffer.add(log);

      expect(buffer.getSize()).toBe(1);
    });

    it('should flush when buffer is full', async () => {
      const log: AuditLog = {
        id: 'log-1',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        receivedAt: new Date(),
        action: 'user.login',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
        message: 'User logged in',
        hash: 'hash-1',
        createdAt: new Date(),
        userId: null,
        sessionId: null,
        ipAddress: null,
        userAgent: null,
        geolocation: null,
        resourceType: null,
        resourceId: null,
        metadata: {},
        previousHash: null,
        source: 'api',
        correlationId: null,
      };

      // Fill buffer to max size
      for (let i = 0; i < 100; i++) {
        await buffer.add({ ...log, id: `log-${i}` });
      }

      // Next add should trigger flush
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      await buffer.add({ ...log, id: 'log-100' });

      expect(fs.appendFile).toHaveBeenCalled();
    });
  });

  describe('addBatch', () => {
    it('should add multiple logs to buffer', async () => {
      const logs: AuditLog[] = Array(5).fill(null).map((_, i) => ({
        id: `log-${i}`,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        receivedAt: new Date(),
        action: 'user.login',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
        message: 'User logged in',
        hash: `hash-${i}`,
        createdAt: new Date(),
        userId: null,
        sessionId: null,
        ipAddress: null,
        userAgent: null,
        geolocation: null,
        resourceType: null,
        resourceId: null,
        metadata: {},
        previousHash: null,
        source: 'api',
        correlationId: null,
      }));

      await buffer.addBatch(logs);

      expect(buffer.getSize()).toBe(5);
    });
  });

  describe('flush', () => {
    it('should flush buffer to disk', async () => {
      const log: AuditLog = {
        id: 'log-1',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        receivedAt: new Date(),
        action: 'user.login',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
        message: 'User logged in',
        hash: 'hash-1',
        createdAt: new Date(),
        userId: null,
        sessionId: null,
        ipAddress: null,
        userAgent: null,
        geolocation: null,
        resourceType: null,
        resourceId: null,
        metadata: {},
        previousHash: null,
        source: 'api',
        correlationId: null,
      };

      await buffer.add(log);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      await buffer.flush();

      expect(fs.appendFile).toHaveBeenCalled();
      expect(buffer.getSize()).toBe(0);
    });

    it('should do nothing if buffer is empty', async () => {
      await buffer.flush();

      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load logs from disk buffer', async () => {
      const logContent = JSON.stringify({
        id: 'log-1',
        tenantId: 'tenant-1',
        action: 'user.login',
      });

      vi.mocked(fs.readFile).mockResolvedValue(logContent + '\n');

      const logs = await buffer.load();

      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log-1');
    });

    it('should return empty array if buffer file does not exist', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const logs = await buffer.load();

      expect(logs).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear buffer file', async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await buffer.clear();

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should handle missing file gracefully', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      vi.mocked(fs.unlink).mockRejectedValue(error);

      await expect(buffer.clear()).resolves.not.toThrow();
    });
  });

  describe('getSize', () => {
    it('should return current buffer size', async () => {
      const log: AuditLog = {
        id: 'log-1',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        receivedAt: new Date(),
        action: 'user.login',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
        message: 'User logged in',
        hash: 'hash-1',
        createdAt: new Date(),
        userId: null,
        sessionId: null,
        ipAddress: null,
        userAgent: null,
        geolocation: null,
        resourceType: null,
        resourceId: null,
        metadata: {},
        previousHash: null,
        source: 'api',
        correlationId: null,
      };

      await buffer.add(log);

      expect(buffer.getSize()).toBe(1);
    });
  });
});

