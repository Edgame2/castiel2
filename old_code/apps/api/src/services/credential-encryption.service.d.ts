/**
 * Credential Encryption Service
 * Provides AES-256-GCM encryption for sensitive credentials
 */
export declare class CredentialEncryptionService {
    private encryptionKey;
    constructor(encryptionKey: string);
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data: string): string;
    /**
     * Decrypt data
     */
    decrypt(encryptedData: string): string;
    /**
     * Encrypt an object (JSON serializes first)
     */
    encryptObject(obj: Record<string, unknown>): string;
    /**
     * Decrypt to an object
     */
    decryptObject<T = Record<string, unknown>>(encryptedData: string): T;
}
export declare function createCredentialEncryptionService(encryptionKey: string): CredentialEncryptionService;
//# sourceMappingURL=credential-encryption.service.d.ts.map