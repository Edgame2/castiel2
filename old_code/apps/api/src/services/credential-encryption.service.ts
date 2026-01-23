/**
 * Credential Encryption Service
 * Provides AES-256-GCM encryption for sensitive credentials
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class CredentialEncryptionService {
  private encryptionKey: Buffer;

  constructor(encryptionKey: string) {
    // Derive a 32-byte key from the provided key
    this.encryptionKey = createHash('sha256')
      .update(encryptionKey)
      .digest();
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, data] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt an object (JSON serializes first)
   */
  encryptObject(obj: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt to an object
   */
  decryptObject<T = Record<string, unknown>>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted) as T;
  }
}

// Factory function
export function createCredentialEncryptionService(encryptionKey: string): CredentialEncryptionService {
  return new CredentialEncryptionService(encryptionKey);
}











