/**
 * Unit tests for Encryption Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from '../../../../src/services/encryption/EncryptionService';
import { KeyManager } from '../../../../src/services/encryption/KeyManager';
import { AnySecretValue } from '../../../../src/types';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  let mockKeyManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const keyBuffer = Buffer.alloc(32, 'a');
    const keyRecord = {
      keyId: 'key-1',
      key: keyBuffer,
      version: 1,
    };
    mockKeyManager = {
      getActiveKey: vi.fn().mockResolvedValue(keyRecord),
      getKey: vi.fn().mockResolvedValue(keyRecord),
      decryptKeyMaterial: vi.fn().mockImplementation((key: { key: Buffer }) => Promise.resolve(key.key)),
    };
    encryptionService = new EncryptionService(mockKeyManager);
  });

  describe('encryptSecretValue', () => {
    it('should encrypt a secret value', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      const result = await encryptionService.encryptSecretValue(secretValue);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockKeyManager.getActiveKey).toHaveBeenCalled();
    });

    it('should encrypt different secret types', async () => {
      const secretValue: AnySecretValue = {
        type: 'USERNAME_PASSWORD',
        username: 'testuser',
        password: 'testpass',
      };
      
      const result = await encryptionService.encryptSecretValue(secretValue);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('decryptSecretValue', () => {
    it('should decrypt an encrypted secret value', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      // First encrypt
      const encrypted = await encryptionService.encryptSecretValue(secretValue);
      
      // Then decrypt
      const decrypted = await encryptionService.decryptSecretValue(
        encrypted,
        'key-1',
        1
      );
      
      expect(decrypted).toEqual(secretValue);
    });

    it('should throw error if decryption fails', async () => {
      await expect(
        encryptionService.decryptSecretValue('invalid-encrypted-data', 'key-1', 1)
      ).rejects.toThrow();
    });
  });
});


