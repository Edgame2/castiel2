/**
 * Key Manager
 * 
 * Manages encryption keys for secret encryption/decryption.
 * Supports key rotation and versioning.
 */

import { getDatabaseClient } from '@coder/shared';
import { KeyNotFoundError } from '../../errors/SecretErrors';
import * as crypto from 'crypto';

export interface EncryptionKey {
  id: string;
  keyId: string;
  version: number;
  encryptedKey: string;
  algorithm: string;
  status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'DESTROYED';
  createdAt: Date;
  expiresAt?: Date;
  retiredAt?: Date;
}

export class KeyManager {
  private get db() {
    return getDatabaseClient() as any;
  }
  private masterKey: Buffer;
  
  constructor() {
    // Get master key from environment (dev fallback: 64 hex zeros when unset)
    let masterKeyEnv = process.env.SECRET_MASTER_KEY;
    if (!masterKeyEnv || masterKeyEnv.length !== 64) {
      if (process.env.NODE_ENV === 'development') {
        masterKeyEnv = '0'.repeat(64);
      } else {
        if (!masterKeyEnv) throw new Error('SECRET_MASTER_KEY environment variable is required');
        throw new Error('SECRET_MASTER_KEY must be 64 hex characters (32 bytes)');
      }
    }
    this.masterKey = Buffer.from(masterKeyEnv, 'hex');
    if (this.masterKey.length !== 32) {
      throw new Error('SECRET_MASTER_KEY must be 64 hex characters (32 bytes)');
    }
  }
  
  /**
   * Get or create the active encryption key
   */
  async getActiveKey(): Promise<EncryptionKey> {
    const key = await this.db.secret_encryption_keys.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        version: 'desc',
      },
    });
    
    if (key) {
      return this.mapToEncryptionKey(key);
    }
    
    // Create initial key if none exists
    return await this.createKey();
  }
  
  /**
   * Get a specific key by ID and version
   */
  async getKey(keyId: string, version?: number): Promise<EncryptionKey> {
    const where: any = { keyId };
    if (version !== undefined) {
      where.version = version;
    } else {
      // Get latest version
      where.version = {
        // Get max version
      };
    }
    
    const key = await this.db.secret_encryption_keys.findFirst({
      where,
      orderBy: {
        version: 'desc',
      },
    });
    
    if (!key) {
      throw new KeyNotFoundError(keyId);
    }
    
    return this.mapToEncryptionKey(key);
  }
  
  /**
   * Create a new encryption key
   */
  async createKey(keyId: string = 'default'): Promise<EncryptionKey> {
    // Generate new AES-256 key (32 bytes)
    const keyMaterial = crypto.randomBytes(32);
    
    // Encrypt key material with master key
    const encryptedKey = this.encryptKeyMaterial(keyMaterial);
    
    // Get next version number
    const maxVersion = await this.db.secret_encryption_keys.findFirst({
      where: { keyId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    
    const version = (maxVersion?.version || 0) + 1;
    
    // Store encrypted key
    const key = await this.db.secret_encryption_keys.create({
      data: {
        keyId,
        version,
        encryptedKey: encryptedKey.toString('hex'),
        algorithm: 'AES-256-GCM',
        status: 'ACTIVE',
      },
    });
    
    return this.mapToEncryptionKey(key);
  }
  
  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string = 'default'): Promise<EncryptionKey> {
    const currentKey = await this.getKey(keyId);
    
    // Create new key
    const newKey = await this.createKey(keyId);
    
    // Mark old key as rotating
    await this.db.secret_encryption_keys.update({
      where: { id: currentKey.id },
      data: { status: 'ROTATING' },
    });
    
    // Note: Re-encrypting all secrets with new key should be done asynchronously
    // in a background job to avoid blocking. For now, secrets will continue to use
    // their existing encryption keys until they are updated. When a secret is updated,
    // it will automatically use the new active key.
    // 
    // To implement full key rotation:
    // 1. Create a background job that iterates through all secrets
    // 2. Decrypt each secret with old key
    // 3. Re-encrypt with new key
    // 4. Update secret record
    // 5. Mark old key as RETIRED after all secrets are migrated
    
    return newKey;
  }
  
  /**
   * Decrypt key material from database
   */
  async decryptKeyMaterial(key: EncryptionKey): Promise<Buffer> {
    const encryptedKey = Buffer.from(key.encryptedKey, 'hex');
    return this.decryptKeyMaterialFromBuffer(encryptedKey);
  }
  
  /**
   * Encrypt key material with master key
   */
  private encryptKeyMaterial(keyMaterial: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(keyMaterial),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Return: IV (16) + AuthTag (16) + Encrypted (32) = 64 bytes
    return Buffer.concat([iv, authTag, encrypted]);
  }
  
  /**
   * Decrypt key material with master key
   */
  private decryptKeyMaterialFromBuffer(encrypted: Buffer): Buffer {
    const iv = encrypted.subarray(0, 16);
    const authTag = encrypted.subarray(16, 32);
    const encryptedData = encrypted.subarray(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
  }
  
  /**
   * Map database model to EncryptionKey
   */
  private mapToEncryptionKey(key: any): EncryptionKey {
    return {
      id: key.id,
      keyId: key.keyId,
      version: key.version,
      encryptedKey: key.encryptedKey,
      algorithm: key.algorithm,
      status: key.status,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt || undefined,
      retiredAt: key.retiredAt || undefined,
    };
  }
}
