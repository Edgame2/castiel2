/**
 * Secret Management Error Classes
 * 
 * Custom error classes for secret management operations
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class SecretError extends Error {
  constructor(
    message: string,
    public code: SecretErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SecretError';
    Object.setPrototypeOf(this, SecretError.prototype);
  }
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum SecretErrorCode {
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  SECRET_EXPIRED = 'SECRET_EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_SECRET_TYPE = 'INVALID_SECRET_TYPE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  VAULT_CONNECTION_FAILED = 'VAULT_CONNECTION_FAILED',
  VAULT_NOT_CONFIGURED = 'VAULT_NOT_CONFIGURED',
  ROTATION_FAILED = 'ROTATION_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  INVALID_SCOPE = 'INVALID_SCOPE',
  INVALID_SECRET_VALUE = 'INVALID_SECRET_VALUE',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_ROTATION_FAILED = 'KEY_ROTATION_FAILED',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
  GRANT_NOT_FOUND = 'GRANT_NOT_FOUND',
  INVALID_GRANTEE = 'INVALID_GRANTEE',
  SECRET_ALREADY_EXISTS = 'SECRET_ALREADY_EXISTS',
  RECOVERY_PERIOD_EXPIRED = 'RECOVERY_PERIOD_EXPIRED',
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

export class SecretNotFoundError extends SecretError {
  constructor(secretId: string, cause?: Error) {
    super(
      `Secret not found: ${secretId}`,
      SecretErrorCode.SECRET_NOT_FOUND,
      cause
    );
    this.name = 'SecretNotFoundError';
  }
}

export class SecretExpiredError extends SecretError {
  constructor(secretId: string, expiresAt: Date, cause?: Error) {
    super(
      `Secret expired: ${secretId} (expired at ${expiresAt.toISOString()})`,
      SecretErrorCode.SECRET_EXPIRED,
      cause
    );
    this.name = 'SecretExpiredError';
  }
}

export class AccessDeniedError extends SecretError {
  constructor(
    secretId: string,
    userId: string,
    action: string,
    reason?: string,
    cause?: Error
  ) {
    super(
      `Access denied: User ${userId} cannot ${action} secret ${secretId}${reason ? `: ${reason}` : ''}`,
      SecretErrorCode.ACCESS_DENIED,
      cause
    );
    this.name = 'AccessDeniedError';
  }
}

export class InvalidSecretTypeError extends SecretError {
  constructor(type: string, cause?: Error) {
    super(
      `Invalid secret type: ${type}`,
      SecretErrorCode.INVALID_SECRET_TYPE,
      cause
    );
    this.name = 'InvalidSecretTypeError';
  }
}

export class EncryptionError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Encryption failed: ${message}`,
      SecretErrorCode.ENCRYPTION_FAILED,
      cause
    );
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Decryption failed: ${message}`,
      SecretErrorCode.DECRYPTION_FAILED,
      cause
    );
    this.name = 'DecryptionError';
  }
}

export class VaultConnectionError extends SecretError {
  constructor(vaultId: string, message: string, cause?: Error) {
    super(
      `Vault connection failed: ${vaultId} - ${message}`,
      SecretErrorCode.VAULT_CONNECTION_FAILED,
      cause
    );
    this.name = 'VaultConnectionError';
  }
}

export class VaultNotConfiguredError extends SecretError {
  constructor(vaultIdOrScope: string, cause?: Error) {
    super(
      `Vault not configured: ${vaultIdOrScope}`,
      SecretErrorCode.VAULT_NOT_CONFIGURED,
      cause
    );
    this.name = 'VaultNotConfiguredError';
  }
}

export class RotationError extends SecretError {
  constructor(secretId: string, message: string, cause?: Error) {
    super(
      `Rotation failed for secret ${secretId}: ${message}`,
      SecretErrorCode.ROTATION_FAILED,
      cause
    );
    this.name = 'RotationError';
  }
}

export class ImportError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Import failed: ${message}`,
      SecretErrorCode.IMPORT_FAILED,
      cause
    );
    this.name = 'ImportError';
  }
}

export class ExportError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Export failed: ${message}`,
      SecretErrorCode.EXPORT_FAILED,
      cause
    );
    this.name = 'ExportError';
  }
}

export class MigrationError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Migration failed: ${message}`,
      SecretErrorCode.MIGRATION_FAILED,
      cause
    );
    this.name = 'MigrationError';
  }
}

export class InvalidScopeError extends SecretError {
  constructor(scope: string, cause?: Error) {
    super(
      `Invalid scope: ${scope}`,
      SecretErrorCode.INVALID_SCOPE,
      cause
    );
    this.name = 'InvalidScopeError';
  }
}

export class InvalidSecretValueError extends SecretError {
  constructor(type: string, message: string, cause?: Error) {
    super(
      `Invalid secret value for type ${type}: ${message}`,
      SecretErrorCode.INVALID_SECRET_VALUE,
      cause
    );
    this.name = 'InvalidSecretValueError';
  }
}

export class KeyNotFoundError extends SecretError {
  constructor(keyId: string, cause?: Error) {
    super(
      `Encryption key not found: ${keyId}`,
      SecretErrorCode.KEY_NOT_FOUND,
      cause
    );
    this.name = 'KeyNotFoundError';
  }
}

export class KeyRotationError extends SecretError {
  constructor(message: string, cause?: Error) {
    super(
      `Key rotation failed: ${message}`,
      SecretErrorCode.KEY_ROTATION_FAILED,
      cause
    );
    this.name = 'KeyRotationError';
  }
}

export class VersionNotFoundError extends SecretError {
  constructor(secretId: string, version: number, cause?: Error) {
    super(
      `Version ${version} not found for secret ${secretId}`,
      SecretErrorCode.VERSION_NOT_FOUND,
      cause
    );
    this.name = 'VersionNotFoundError';
  }
}

export class GrantNotFoundError extends SecretError {
  constructor(grantId: string, cause?: Error) {
    super(
      `Access grant not found: ${grantId}`,
      SecretErrorCode.GRANT_NOT_FOUND,
      cause
    );
    this.name = 'GrantNotFoundError';
  }
}

export class InvalidGranteeError extends SecretError {
  constructor(granteeType: string, granteeId: string, cause?: Error) {
    super(
      `Invalid grantee: ${granteeType} with ID ${granteeId}`,
      SecretErrorCode.INVALID_GRANTEE,
      cause
    );
    this.name = 'InvalidGranteeError';
  }
}

export class SecretAlreadyExistsError extends SecretError {
  constructor(name: string, scope: string, cause?: Error) {
    super(
      `Secret already exists: ${name} at scope ${scope}`,
      SecretErrorCode.SECRET_ALREADY_EXISTS,
      cause
    );
    this.name = 'SecretAlreadyExistsError';
  }
}

export class RecoveryPeriodExpiredError extends SecretError {
  constructor(secretId: string, recoveryDeadline: Date, cause?: Error) {
    super(
      `Recovery period expired for secret ${secretId} (deadline: ${recoveryDeadline.toISOString()})`,
      SecretErrorCode.RECOVERY_PERIOD_EXPIRED,
      cause
    );
    this.name = 'RecoveryPeriodExpiredError';
  }
}
