import { SAML } from '@node-saml/passport-saml';
import type { Redis } from 'ioredis';
import type { SAMLConfig, SAMLProfile, SSOSession } from '../../types/sso.types.js';
/**
 * SAML Service
 * Handles SAML authentication flows
 */
export declare class SAMLService {
    private readonly redis;
    private readonly SESSION_PREFIX;
    private readonly SESSION_TTL;
    constructor(redis: Redis);
    /**
     * Create SAML instance from configuration
     */
    createSAMLInstance(config: SAMLConfig): SAML;
    /**
     * Generate SAML authentication request
     */
    generateAuthRequest(saml: SAML, orgId: string, relayState?: string): Promise<{
        url: string;
        requestId: string;
    }>;
    /**
     * Validate SAML response and extract user profile
     */
    validateResponse(saml: SAML, body: any, config: SAMLConfig): Promise<SAMLProfile>;
    /**
     * Map SAML profile to our SAMLProfile type
     */
    private mapProfile;
    /**
     * Get attribute value from SAML assertion
     */
    private getAttribute;
    /**
     * Get attribute array from SAML assertion
     */
    private getAttributeArray;
    /**
     * Create SAML session in Redis
     */
    private createSession;
    /**
     * Validate and retrieve SAML session
     */
    validateSession(requestId: string): Promise<SSOSession | null>;
    /**
     * Generate SAML logout request
     */
    generateLogoutRequest(saml: SAML, nameID: string, sessionIndex: string): Promise<string>;
    /**
     * Validate SAML logout response
     */
    validateLogoutResponse(saml: SAML, body: any): Promise<boolean>;
    /**
     * Generate metadata XML for service provider
     */
    generateMetadata(saml: SAML): Promise<string>;
    /**
     * Validate certificate format
     */
    validateCertificate(cert: string): boolean;
}
//# sourceMappingURL=saml.service.d.ts.map