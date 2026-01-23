import { SAML } from '@node-saml/passport-saml';
/**
 * SAML Service
 * Handles SAML authentication flows
 */
export class SAMLService {
    redis;
    SESSION_PREFIX = 'saml:session:';
    SESSION_TTL = 600; // 10 minutes
    constructor(redis) {
        this.redis = redis;
    }
    /**
     * Create SAML instance from configuration
     */
    createSAMLInstance(config) {
        const samlConfig = {
            // Service Provider (our app)
            issuer: config.entityId,
            callbackUrl: config.callbackUrl,
            decryptionPvk: config.privateKey,
            // Identity Provider (external SSO)
            entryPoint: config.entryPoint,
            idpIssuer: config.issuer,
            idpCert: config.idpCert,
            // Signature and encryption
            signatureAlgorithm: config.signatureAlgorithm || 'sha256',
            digestAlgorithm: config.digestAlgorithm || 'sha256',
            wantAssertionsSigned: config.wantAssertionsSigned ?? true,
            wantAuthnResponseSigned: config.wantAuthnResponseSigned ?? false,
            // SAML options
            acceptedClockSkewMs: 180000, // 3 minutes clock skew tolerance
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            requestIdExpirationPeriodMs: 600000, // 10 minutes
        };
        return new SAML(samlConfig);
    }
    /**
     * Generate SAML authentication request
     */
    async generateAuthRequest(saml, orgId, relayState) {
        const url = await saml.getAuthorizeUrlAsync('', '', {});
        // Extract request ID from URL (embedded in SAML request)
        const requestId = `saml-${orgId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        // Store session for callback validation
        await this.createSession(orgId, requestId, relayState);
        return { url, requestId };
    }
    /**
     * Validate SAML response and extract user profile
     */
    async validateResponse(saml, body, config) {
        const { profile } = await saml.validatePostResponseAsync(body);
        if (!profile) {
            throw new Error('No profile returned from SAML assertion');
        }
        // Map SAML attributes to our profile
        return this.mapProfile(profile, config);
    }
    /**
     * Map SAML profile to our SAMLProfile type
     */
    mapProfile(profile, config) {
        const attrs = profile.attributes || {};
        const mapping = config.attributeMapping;
        // Get email from mapped attribute or nameID
        const email = this.getAttribute(attrs, mapping.email) || profile.nameID || '';
        // Get first and last name
        const firstName = mapping.firstName
            ? this.getAttribute(attrs, mapping.firstName)
            : undefined;
        const lastName = mapping.lastName
            ? this.getAttribute(attrs, mapping.lastName)
            : undefined;
        // Get display name
        const displayName = mapping.displayName
            ? this.getAttribute(attrs, mapping.displayName)
            : undefined;
        // Get groups
        const groups = mapping.groups
            ? this.getAttributeArray(attrs, mapping.groups)
            : undefined;
        return {
            issuer: profile.issuer || '',
            sessionIndex: profile.sessionIndex || '',
            nameID: profile.nameID || '',
            nameIDFormat: profile.nameIDFormat || '',
            email,
            firstName,
            lastName,
            displayName,
            groups,
            attributes: attrs,
        };
    }
    /**
     * Get attribute value from SAML assertion
     */
    getAttribute(attrs, attrName) {
        if (!attrs || !attrName) {
            return undefined;
        }
        const value = attrs[attrName];
        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    }
    /**
     * Get attribute array from SAML assertion
     */
    getAttributeArray(attrs, attrName) {
        if (!attrs || !attrName) {
            return undefined;
        }
        const value = attrs[attrName];
        if (Array.isArray(value)) {
            return value;
        }
        if (value) {
            return [value];
        }
        return undefined;
    }
    /**
     * Create SAML session in Redis
     */
    async createSession(orgId, requestId, relayState) {
        const session = {
            orgId,
            requestId,
            relayState,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.SESSION_TTL * 1000,
        };
        const key = `${this.SESSION_PREFIX}${requestId}`;
        await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(session));
    }
    /**
     * Validate and retrieve SAML session
     */
    async validateSession(requestId) {
        const key = `${this.SESSION_PREFIX}${requestId}`;
        const sessionJson = await this.redis.get(key);
        if (!sessionJson) {
            return null;
        }
        // Delete session (one-time use)
        await this.redis.del(key);
        try {
            const session = JSON.parse(sessionJson);
            // Check if expired
            if (Date.now() > session.expiresAt) {
                return null;
            }
            return session;
        }
        catch {
            return null;
        }
    }
    /**
     * Generate SAML logout request
     */
    async generateLogoutRequest(saml, nameID, sessionIndex) {
        // Create a minimal profile for logout
        const profile = {
            issuer: '',
            nameID,
            nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            sessionIndex,
        };
        const url = await saml.getLogoutUrlAsync(profile, '', // request template
        {} // additional params
        );
        if (!url) {
            throw new Error('Failed to generate SAML logout request');
        }
        return url;
    }
    /**
     * Validate SAML logout response
     */
    async validateLogoutResponse(saml, body) {
        try {
            await saml.validatePostResponseAsync(body);
            return true;
        }
        catch (error) {
            throw new Error(`SAML logout validation failed: ${error.message}`);
        }
    }
    /**
     * Generate metadata XML for service provider
     */
    async generateMetadata(saml) {
        const metadata = await saml.generateServiceProviderMetadata(null, null);
        if (!metadata) {
            throw new Error('Failed to generate metadata');
        }
        return metadata;
    }
    /**
     * Validate certificate format
     */
    validateCertificate(cert) {
        try {
            // Check if it's PEM format
            if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
                return false;
            }
            // Try to parse the certificate
            const cleaned = cert
                .replace(/-----BEGIN CERTIFICATE-----/, '')
                .replace(/-----END CERTIFICATE-----/, '')
                .replace(/\s/g, '');
            // Check if it's valid base64
            const buffer = Buffer.from(cleaned, 'base64');
            return buffer.length > 0;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=saml.service.js.map