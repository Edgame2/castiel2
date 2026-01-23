/**
 * Credential Service
 *
 * Wrapper around SecureCredentialService for integration credential management.
 * Provides Key Vault integration for OAuth tokens and other credentials.
 *
 * This service is a convenience wrapper that re-exports
 * SecureCredentialService functionality for use in integration contexts.
 */
// Re-export the service class with the expected name
export { SecureCredentialService as CredentialService } from '../secure-credential.service.js';
export { CredentialType } from '../secure-credential.service.js';
//# sourceMappingURL=credential.service.js.map