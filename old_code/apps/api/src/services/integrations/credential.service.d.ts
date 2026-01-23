/**
 * Credential Service
 *
 * Wrapper around SecureCredentialService for integration credential management.
 * Provides Key Vault integration for OAuth tokens and other credentials.
 *
 * This service is a convenience wrapper that re-exports
 * SecureCredentialService functionality for use in integration contexts.
 */
export { SecureCredentialService as CredentialService } from '../secure-credential.service.js';
export type { CredentialMetadata, CredentialResult, CredentialRotationPolicy, ExpiringCredential, CertificateAuthConfig, StoreCredentialResult, } from '../secure-credential.service.js';
export { CredentialType } from '../secure-credential.service.js';
//# sourceMappingURL=credential.service.d.ts.map