/**
 * SSO Provider types
 */
export declare enum SSOProvider {
    OKTA = "okta",
    AZURE_AD = "azure_ad",
    GOOGLE_WORKSPACE = "google_workspace",
    GENERIC_SAML = "generic_saml"
}
/**
 * SSO Configuration Status
 */
export declare enum SSOConfigStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    PENDING = "pending"
}
/**
 * SAML Configuration
 */
export interface SAMLConfig {
    entityId: string;
    callbackUrl: string;
    cert?: string;
    privateKey?: string;
    entryPoint: string;
    issuer: string;
    idpCert: string;
    signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
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
 * Organization SSO Configuration document in Cosmos DB
 */
export interface SSOConfiguration {
    id: string;
    orgId: string;
    orgName: string;
    provider: SSOProvider;
    status: SSOConfigStatus;
    samlConfig: SAMLConfig;
    jitProvisioning: {
        enabled: boolean;
        autoActivate: boolean;
        defaultRole?: string;
        allowedDomains?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    partitionKey: string;
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
//# sourceMappingURL=sso.types.d.ts.map