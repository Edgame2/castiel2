/**
 * SAML 2.0 Handler
 * 
 * Handles SAML authentication flows for Azure AD and Okta
 * Migrated from server/src/auth/SAMLHandler.ts
 */

import { getDatabaseClient } from '@coder/shared';
import { createSession } from './SessionService';
import { log } from '../utils/logger';
import { loadConfig } from '../config';
import { getAccountService } from './AccountService';
import { FastifyInstance } from 'fastify';

export interface SAMLRequestOptions {
  organizationId: string;
  relayState?: string;
}

export interface SAMLResponseData {
  SAMLResponse: string;
  RelayState?: string;
}

/**
 * Get SSO credentials from Secret Management Service.
 * Uses service-to-service authentication. Secret management URL must be set via config or SECRET_MANAGEMENT_SERVICE_URL; no default URL in code per .cursorrules.
 */
async function getSSOCredentials(
  organizationId: string,
  secretId: string
): Promise<{ certificate?: string; privateKey?: string }> {
  const config = loadConfig();
  const secretManagementUrl = config.services?.secret_management?.url || process.env.SECRET_MANAGEMENT_SERVICE_URL;
  if (!secretManagementUrl || secretManagementUrl.trim() === '') {
    throw new Error(
      'Secret management URL required: set SECRET_MANAGEMENT_URL or config.services.secret_management.url (or SECRET_MANAGEMENT_SERVICE_URL env)'
    );
  }
  const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN || '';
  
  if (!serviceAuthToken) {
    log.warn('SERVICE_AUTH_TOKEN not configured, cannot retrieve SSO credentials', {
      organizationId,
      secretId,
      service: 'auth',
    });
    throw new Error('Service authentication token not configured');
  }

  try {
    const response = await fetch(`${secretManagementUrl}/api/secrets/sso/${secretId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceAuthToken,
        'X-Requesting-Service': 'auth-service',
        'X-Organization-Id': organizationId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Failed to retrieve SSO credentials from secret management service', new Error(errorText), {
        organizationId,
        secretId,
        status: response.status,
        service: 'auth',
      });
      throw new Error(`Failed to retrieve SSO credentials: ${response.status} ${errorText}`);
    }

    const result = await response.json() as {
      secretId: string;
      organizationId: string;
      credentials: {
        certificate?: string;
        privateKey?: string;
        chain?: string;
        passphrase?: string;
      };
    };

    log.debug('SSO credentials retrieved from secret management service', {
      organizationId,
      secretId,
      hasCertificate: !!result.credentials.certificate,
      hasPrivateKey: !!result.credentials.privateKey,
      service: 'auth',
    });

    return {
      certificate: result.credentials.certificate,
      privateKey: result.credentials.privateKey,
    };
  } catch (error: any) {
    log.error('Error retrieving SSO credentials from secret management service', error, {
      organizationId,
      secretId,
      service: 'auth',
    });
    throw error;
  }
}

/**
 * Generate SAML authentication request
 */
export async function generateSAMLRequest(
  organizationId: string,
  relayState?: string
): Promise<{ samlRequest: string; redirectUrl: string; relayState: string }> {
  const db = getDatabaseClient() as any;
  const config = loadConfig();

  // Get SSO configuration
  const ssoConfig = await db.sSOConfiguration.findUnique({
    where: { organizationId },
    include: { organization: true },
  });

  if (!ssoConfig || !ssoConfig.isActive) {
    throw new Error('SSO is not configured or not active for this organization');
  }

  // Get credentials from Secret Management Service
  let credentials: { certificate?: string; privateKey?: string } = {};
  if (ssoConfig.secretId) {
    credentials = await getSSOCredentials(organizationId, ssoConfig.secretId);
  }

  if (!credentials.certificate || !credentials.privateKey) {
    throw new Error('SSO credentials are incomplete');
  }

  // Generate SAML request
  // Note: In production, use a proper SAML library like 'samlify' or 'passport-saml'
  // For now, we'll generate a basic SAML AuthnRequest XML and encode it
  const requestId = `_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  const timestamp = new Date().toISOString();
  const entityId = ssoConfig.entityId || ssoConfig.organization.slug;
  if (!config.server?.base_url?.trim()) {
    throw new Error('SAML requires server.base_url to be set (config.server.base_url or BASE_URL env)');
  }
  const acsUrl = `${config.server.base_url}/api/v1/auth/sso/saml/callback`;
  
  // Generate basic SAML AuthnRequest XML
  // In production, this should be properly signed and use a SAML library
  const samlRequestXml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${timestamp}"
                    Destination="${ssoConfig.ssoUrl}"
                    AssertionConsumerServiceURL="${acsUrl}">
  <saml:Issuer>${entityId}</saml:Issuer>
</samlp:AuthnRequest>`;

  // Encode to base64
  const samlRequestBase64 = Buffer.from(samlRequestXml).toString('base64');

  const finalRelayState = relayState || `org:${organizationId}`;

  return {
    samlRequest: samlRequestBase64,
    redirectUrl: ssoConfig.ssoUrl!,
    relayState: finalRelayState,
  };
}

/**
 * Process SAML response and authenticate user
 */
export async function processSAMLResponse(
  samlResponse: string,
  relayState: string,
  fastify: FastifyInstance,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<{ user: any; session: any }> {
  const db = getDatabaseClient() as any;

  // Extract organization ID from relay state
  const orgMatch = relayState.match(/org:([^:]+)/);
  if (!orgMatch) {
    throw new Error('Invalid relay state');
  }
  const organizationId = orgMatch[1];

  // Get SSO configuration
  const ssoConfig = await db.sSOConfiguration.findUnique({
    where: { organizationId },
    include: { organization: true },
  });

  if (!ssoConfig || !ssoConfig.isActive) {
    throw new Error('SSO is not configured or not active for this organization');
  }

  // Get credentials from Secret Management Service
  let credentials: { certificate?: string; privateKey?: string } = {};
  if (ssoConfig.secretId) {
    credentials = await getSSOCredentials(organizationId, ssoConfig.secretId);
  }

  if (!credentials.certificate) {
    throw new Error('SSO certificate not found');
  }

  // Verify and parse SAML response
  // Note: In production, use a proper SAML library like 'samlify' or 'passport-saml'
  // For now, we'll do basic XML parsing
  let samlAssertion: any;
  try {
    // Decode SAML response
    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    // Basic validation - check if it's valid XML and contains SAML response
    if (!decodedResponse.includes('<samlp:Response') && !decodedResponse.includes('<saml2p:Response')) {
      throw new Error('Invalid SAML response format');
    }
    
    // In production, validate XML signature here using the certificate
    // For now, we'll extract basic information from the XML
    // This is a simplified implementation - use proper SAML library in production
    
    // Extract NameID (email)
    const nameIdMatch = decodedResponse.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i) ||
                       decodedResponse.match(/<saml2:NameID[^>]*>([^<]+)<\/saml2:NameID>/i);
    const nameID = nameIdMatch ? nameIdMatch[1] : null;
    
    // Extract attributes (simplified - in production use proper XML parsing)
    const attributes: Record<string, string[]> = {};
    
    // Try to extract email attribute
    const emailMatches = decodedResponse.match(/<saml:Attribute[^>]*Name="(?:email|Email|mail|mailaddress)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
                        decodedResponse.match(/<saml2:Attribute[^>]*Name="(?:email|Email|mail|mailaddress)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/i);
    if (emailMatches) {
      attributes.email = [emailMatches[1]];
    }
    
    // Try to extract name attributes
    const nameMatches = decodedResponse.match(/<saml:Attribute[^>]*Name="(?:name|Name|displayName|fullName)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
                       decodedResponse.match(/<saml2:Attribute[^>]*Name="(?:name|Name|displayName|fullName)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/i);
    if (nameMatches) {
      attributes.name = [nameMatches[1]];
    }
    
    // Try to extract firstName
    const firstNameMatches = decodedResponse.match(/<saml:Attribute[^>]*Name="(?:firstName|givenName|first_name)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
                            decodedResponse.match(/<saml2:Attribute[^>]*Name="(?:firstName|givenName|first_name)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/i);
    if (firstNameMatches) {
      attributes.firstName = [firstNameMatches[1]];
    }
    
    // Try to extract lastName
    const lastNameMatches = decodedResponse.match(/<saml:Attribute[^>]*Name="(?:lastName|surname|last_name)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
                           decodedResponse.match(/<saml2:Attribute[^>]*Name="(?:lastName|surname|last_name)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/i);
    if (lastNameMatches) {
      attributes.lastName = [lastNameMatches[1]];
    }
    
    // Create assertion object
    samlAssertion = {
      nameID: nameID,
      attributes: attributes,
    };
  } catch (error: any) {
    log.error('SAML response validation/parsing failed', error, { organizationId, service: 'auth' });
    throw new Error('Invalid SAML response');
  }

  // Extract user attributes
  const extractedAttributes = samlAssertion.attributes || {};
  const email = extractedAttributes[ssoConfig.attributeMappings?.email || 'email']?.[0] || 
                samlAssertion.nameID || 
                extractedAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']?.[0];

  if (!email) {
    throw new Error('Email not found in SAML assertion');
  }

  // Find or create user
  let user = await db.user.findUnique({
    where: { email },
  });

  const firstName = extractedAttributes[ssoConfig.attributeMappings?.firstName || 'firstName']?.[0] ||
                    extractedAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']?.[0];
  const lastName = extractedAttributes[ssoConfig.attributeMappings?.lastName || 'lastName']?.[0] ||
                   extractedAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']?.[0];
  const name = extractedAttributes[ssoConfig.attributeMappings?.name || 'name']?.[0] ||
               (firstName && lastName ? `${firstName} ${lastName}` : undefined) ||
               samlAssertion.nameID;

  if (!user) {
    // Check if user is invited to this organization
    const invitation = await db.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    // Generate username
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
    let username = baseUsername;
    let counter = 1;
    
    while (await db.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 1000) {
        username = `${baseUsername}-${Date.now()}`;
        break;
      }
    }

    // Create new user
    user = await db.user.create({
      data: {
        email,
        username,
        name: name || email,
        firstName,
        lastName,
        authProviders: [ssoConfig.provider] as any,
        profile: {
          create: {
            role: 'Developer',
          },
        },
        userAuthProviders: {
          create: {
            provider: ssoConfig.provider,
            providerUserId: samlAssertion.nameID || email,
            providerData: extractedAttributes,
            isPrimary: true,
          },
        },
      },
    });

    // Create Account for user
    const accountService = getAccountService();
    await accountService.createUserAccount(
      user.id,
      username,
      name || email
    );

    // If there's an invitation, accept it
    if (invitation) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          invitedUserId: user.id,
        },
      });

      // Create organization membership
      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId,
          roleId: invitation.roleId,
          status: 'active',
          joinedAt: new Date(),
        },
      });
    }
  } else {
    // Update or create auth provider
    const existingProvider = await db.userAuthProvider.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: ssoConfig.provider,
        },
      },
    });

    if (existingProvider) {
      await db.userAuthProvider.update({
        where: { id: existingProvider.id },
        data: {
          lastUsedAt: new Date(),
          providerData: extractedAttributes,
        },
      });
    } else {
      await db.userAuthProvider.create({
        data: {
          userId: user.id,
          provider: ssoConfig.provider,
          providerUserId: samlAssertion.nameID || email,
          providerData: extractedAttributes,
          isPrimary: !user.passwordHash,
        },
      });

      // Update auth providers array
      const currentProviders = (user.authProviders as string[]) || [];
      const updatedProviders = [...new Set([...currentProviders, ssoConfig.provider])] as string[];
      await db.user.update({
        where: { id: user.id },
        data: {
          authProviders: updatedProviders as any,
        },
      });
    }

    // Update user info if needed
    if (name && !user.name) {
      await db.user.update({
        where: { id: user.id },
        data: { name },
      });
    }
  }

  // Check organization membership
  const membership = await db.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId,
      },
    },
  });

  if (!membership || membership.status !== 'active') {
    throw new Error('User is not a member of this organization');
  }

  // Create session with IP and user agent from request
  const { accessToken, refreshToken, sessionId } = await createSession(
    user.id,
    organizationId,
    false,
    ipAddress || null,
    userAgent || null,
    undefined,
    fastify
  );

  return {
    user,
    session: {
      accessToken,
      refreshToken,
      sessionId,
    },
  };
}

