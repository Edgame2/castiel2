/**
 * SSO Provider types
 */
export enum SSOProvider {
  OKTA = 'okta',
  AZURE_AD = 'azure_ad',
  GOOGLE_WORKSPACE = 'google_workspace',
  GENERIC_SAML = 'generic_saml',
}

/**
 * SSO Configuration Status
 */
export enum SSOConfigStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

/**
 * SAML Configuration
 */
export interface SAMLConfig {
  // Service Provider (SP) configuration - our service
  entityId: string; // SP entity ID (usually the callback URL)
  callbackUrl: string; // SP assertion consumer service URL
  cert?: string; // SP certificate (optional, for signing)
  privateKey?: string; // SP private key (optional, for signing)

  // Identity Provider (IdP) configuration - external SSO provider
  entryPoint: string; // IdP single sign-on URL
  issuer: string; // IdP entity ID
  idpCert: string; // IdP certificate for signature validation
  
  // SAML options
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  wantAssertionsSigned?: boolean;
  wantAuthnResponseSigned?: boolean;
  
  // Attribute mapping
  attributeMapping: {
    email: string; // SAML attribute name for email
    firstName?: string; // SAML attribute name for first name
    lastName?: string; // SAML attribute name for last name
    displayName?: string; // SAML attribute name for display name
    groups?: string; // SAML attribute name for groups
  };
}

/**
 * Organization SSO Configuration document in Cosmos DB
 */
export interface SSOConfiguration {
  id: string; // org-{orgId}-sso
  orgId: string; // Organization ID
  orgName: string; // Organization name
  provider: SSOProvider;
  status: SSOConfigStatus;
  
  // SAML configuration
  samlConfig: SAMLConfig;
  
  // JIT provisioning settings
  jitProvisioning: {
    enabled: boolean;
    autoActivate: boolean; // Auto-activate new users
    defaultRole?: string; // Default role for new users
    allowedDomains?: string[]; // Restrict to specific email domains
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID who created the config
  
  // Partition key (organization isolation)
  partitionKey: string; // Same as orgId
}

/**
 * SAML user profile from assertion
 */
export interface SAMLProfile {
  issuer: string;
  sessionIndex: string;
  nameID: string;
  nameIDFormat: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  attributes?: Record<string, any>;
}

/**
 * SSO session data stored in Redis
 */
export interface SSOSession {
  orgId: string;
  requestId: string;
  relayState?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Create SSO configuration request
 */
export interface CreateSSOConfigRequest {
  orgId: string;
  orgName: string;
  provider: SSOProvider;
  samlConfig: SAMLConfig;
  jitProvisioning?: {
    enabled?: boolean;
    autoActivate?: boolean;
    defaultRole?: string;
    allowedDomains?: string[];
  };
}

/**
 * Update SSO configuration request
 */
export interface UpdateSSOConfigRequest {
  orgName?: string;
  status?: SSOConfigStatus;
  samlConfig?: Partial<SAMLConfig>;
  jitProvisioning?: {
    enabled?: boolean;
    autoActivate?: boolean;
    defaultRole?: string;
    allowedDomains?: string[];
  };
}
