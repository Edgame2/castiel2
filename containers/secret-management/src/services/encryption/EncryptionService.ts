/**
 * Encryption Service
 * 
 * Handles encryption and decryption of secret values using AES-256-GCM.
 */

import * as crypto from 'crypto';
import { KeyManager, EncryptionKey } from './KeyManager';
import { EncryptionError, DecryptionError } from '../../errors/SecretErrors';
import { AnySecretValue } from '../../types';

export class EncryptionService {
  private keyManager: KeyManager;
  
  constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
  }
  
  /**
   * Encrypt a secret value
   */
  async encrypt(value: string, keyId?: string, keyVersion?: number): Promise<EncryptedValue> {
    try {
      // Get encryption key
      let key: EncryptionKey;
      if (keyId && keyVersion) {
        key = await this.keyManager.getKey(keyId, keyVersion);
      } else {
        key = await this.keyManager.getActiveKey();
      }
      
      // Decrypt key material
      const keyMaterial = await this.keyManager.decryptKeyMaterial(key);
      
      // Generate IV
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial, iv);
      
      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]);
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Return encrypted value with metadata
      return {
        encryptedValue: Buffer.concat([iv, authTag, encrypted]).toString('hex'),
        encryptionKeyId: key.keyId,
        encryptionKeyVersion: key.version,
      };
    } catch (error) {
      if (error instanceof EncryptionError || error instanceof DecryptionError) {
        throw error;
      }
      throw new EncryptionError(
        `Failed to encrypt value: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Decrypt a secret value
   */
  async decrypt(encryptedValue: EncryptedValue): Promise<string> {
    try {
      // Get encryption key
      const key = await this.keyManager.getKey(
        encryptedValue.encryptionKeyId,
        encryptedValue.encryptionKeyVersion
      );
      
      // Decrypt key material
      const keyMaterial = await this.keyManager.decryptKeyMaterial(key);
      
      // Parse encrypted data
      const encryptedBuffer = Buffer.from(encryptedValue.encryptedValue, 'hex');
      const iv = encryptedBuffer.subarray(0, 16);
      const authTag = encryptedBuffer.subarray(16, 32);
      const encrypted = encryptedBuffer.subarray(32);
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof DecryptionError) {
        throw error;
      }
      throw new DecryptionError(
        `Failed to decrypt value: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Encrypt a structured secret value (JSON)
   */
  async encryptSecretValue(secretValue: AnySecretValue): Promise<string> {
    const jsonString = JSON.stringify(secretValue);
    const encrypted = await this.encrypt(jsonString);
    return encrypted.encryptedValue;
  }
  
  /**
   * Decrypt a structured secret value (JSON)
   */
  async decryptSecretValue(encryptedValue: string, keyId: string, keyVersion: number): Promise<AnySecretValue> {
    const decrypted = await this.decrypt({
      encryptedValue,
      encryptionKeyId: keyId,
      encryptionKeyVersion: keyVersion,
    });
    return JSON.parse(decrypted) as AnySecretValue;
  }
}

export interface EncryptedValue {
  encryptedValue: string;        // Hex-encoded encrypted data
  encryptionKeyId: string;        // Key identifier
  encryptionKeyVersion: number;   // Key version
}
