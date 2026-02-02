/**
 * Unit tests for Key Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyManager } from '../../../../src/services/encryption/KeyManager';

// Mock database
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_encryption_keys: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    })),
  };
});

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let mockDb: any;
  const validMasterKey = '0'.repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_MASTER_KEY = validMasterKey;
    keyManager = new KeyManager();
    mockDb = (keyManager as any).db;
  });

  afterEach(() => {
    delete process.env.SECRET_MASTER_KEY;
  });

  describe('getActiveKey', () => {
    it('should retrieve the active encryption key', async () => {
      const mockKey = {
        id: 'key-1',
        keyId: 'key-1',
        key: Buffer.from('test-key-32-bytes-long-key-12345'),
        isActive: true,
        createdAt: new Date(),
      };
      
      mockDb.secret_encryption_keys.findFirst.mockResolvedValue(mockKey);
      
      const result = await keyManager.getActiveKey();
      
      expect(result).toBeDefined();
      expect(result.keyId).toBe('key-1');
    });

    it('should create a new key if no active key exists', async () => {
      mockDb.secret_encryption_keys.findFirst.mockResolvedValue(null);
      
      const newKey = {
        id: 'key-1',
        keyId: 'key-1',
        key: Buffer.from('test-key-32-bytes-long-key-12345'),
        isActive: true,
        createdAt: new Date(),
      };
      
      mockDb.secret_encryption_keys.create.mockResolvedValue(newKey);
      
      const result = await keyManager.getActiveKey();
      
      expect(result).toBeDefined();
      expect(mockDb.secret_encryption_keys.create).toHaveBeenCalled();
    });
  });

  describe('rotateKey', () => {
    it('should rotate encryption key', async () => {
      const oldKey = {
        id: 'key-1',
        keyId: 'key-1',
        isActive: true,
      };
      
      const newKey = {
        id: 'key-2',
        keyId: 'key-2',
        key: Buffer.from('new-key-32-bytes-long-key-12345'),
        isActive: true,
      };
      
      mockDb.secret_encryption_keys.findFirst.mockResolvedValue(oldKey);
      mockDb.secret_encryption_keys.create.mockResolvedValue(newKey);
      mockDb.secret_encryption_keys.update.mockResolvedValue({
        ...oldKey,
        isActive: false,
      });
      
      const result = await keyManager.rotateKey();
      
      expect(result).toBeDefined();
      expect(result.keyId).toBe('key-2');
      expect(mockDb.secret_encryption_keys.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ROTATING',
          }),
        })
      );
    });
  });
});


