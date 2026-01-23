/**
 * SSO Configuration Types for Frontend
 */

export type SSOProvider = 'saml' | 'azure_ad' | 'okta' | 'google_workspace';
export type SSOConfigStatus = 'pending' | 'active' | 'inactive';

/**
 * SAML Configuration
 */
export interface SAMLConfig {
  entityId: string;
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  idpCert: string;
  privateKey?: string;
  signatureAlgorithm?: 'sha256' | 'sha512';
  digestAlgorithm?: 'sha256' | 'sha512';
  wantAssertionsSigned?: boolean;
  wantAuthnResponseSigned?: boolean;
  attributeMapping: {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };
}

/**
 * JIT Provisioning Configuration
 */
export interface JITProvisioningConfig {
  enabled: boolean;
  autoActivate: boolean;
  defaultRole?: string;
  allowedDomains?: string[];
}

/**
 * SSO Configuration
 */
export interface SSOConfiguration {
  id: string;
  orgId: string;
  orgName: string;
  provider: SSOProvider;
  status: SSOConfigStatus;
  samlConfig: SAMLConfig;
  jitProvisioning: JITProvisioningConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Create SSO Config Request
 */
export interface CreateSSOConfigRequest {
  orgName: string;
  provider: SSOProvider;
  samlConfig: SAMLConfig;
  jitProvisioning?: Partial<JITProvisioningConfig>;
}

/**
 * Update SSO Config Request
 */
export interface UpdateSSOConfigRequest {
  orgName?: string;
  status?: SSOConfigStatus;
  samlConfig?: Partial<SAMLConfig>;
  jitProvisioning?: Partial<JITProvisioningConfig>;
}

/**
 * SSO Config Response
 */
export interface SSOConfigResponse {
  config: SSOConfiguration;
}

/**
 * Validation Result
 */
export interface SSOValidationResult {
  valid: boolean;
  errors: string[];
}

