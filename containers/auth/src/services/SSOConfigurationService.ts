/**
 * SSO Configuration Service
 * 
 * Manages SSO configuration for organizations, integrating with Secret Management Service
 * for secure credential storage.
 */

import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { getSecretManagementClient, type SSOCredentials as ClientSSOCredentials } from './SecretManagementClient';

/**
 * SSO Provider types
 */
export type SSOProvider = 'azure_ad' | 'okta';

/**
 * SSO Configuration (non-sensitive)
 */
export interface SSOConfigurationData {
  provider: SSOProvider;
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  nameIdFormat?: string;
  authnContext?: string;
  attributeMappings?: Record<string, string>;
}

/**
 * SSO Credentials (sensitive - stored in Secret Management Service)
 */
export interface SSOCredentials {
  // For SAML
  certificate?: string;
  privateKey?: string;
  
  // For Azure AD
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  
  // For Okta
  oktaDomain?: string;
  apiToken?: string;
}

/**
 * Complete SSO Configuration Input
 */
export interface CreateSSOConfigurationInput {
  organizationId: string;
  enabled: boolean;
  provider: SSOProvider;
  enforce?: boolean;
  config: SSOConfigurationData;
  credentials: SSOCredentials;
  createdBy: string;
}

/**
 * SSO Configuration Service
 */
export class SSOConfigurationService {
  private secretClient = getSecretManagementClient();

  constructor() {
    // Secret Management Client is initialized via singleton
  }

  /**
   * Create or update SSO configuration
   */
  async configureSSO(input: CreateSSOConfigurationInput): Promise<{
    ssoConfig: any;
    secretId: string;
  }> {
    const db = getDatabaseClient() as any;
    let secretId: string | null = null;

    try {
      // 1. Store credentials in Secret Management Service
      secretId = await this.storeSSOCredentials(
        input.organizationId,
        input.provider,
        input.credentials,
        input.createdBy
      );

      // 2. Store non-sensitive configuration in database
      const ssoConfig = await db.sSOConfiguration.upsert({
        where: {
          organizationId_provider: {
            organizationId: input.organizationId,
            provider: input.provider,
          },
        },
        create: {
          organizationId: input.organizationId,
          provider: input.provider,
          entityId: input.config.entityId,
          ssoUrl: input.config.ssoUrl,
          sloUrl: input.config.sloUrl,
          nameIdFormat: input.config.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          authnContext: input.config.authnContext,
          attributeMappings: input.config.attributeMappings as any,
          secretId,
          isActive: true,
          createdBy: input.createdBy,
        },
        update: {
          entityId: input.config.entityId,
          ssoUrl: input.config.ssoUrl,
          sloUrl: input.config.sloUrl,
          nameIdFormat: input.config.nameIdFormat,
          authnContext: input.config.authnContext,
          attributeMappings: input.config.attributeMappings as any,
          secretId,
          updatedAt: new Date(),
        },
      });

      // 3. Update organization SSO settings
      await db.organization.update({
        where: { id: input.organizationId },
        data: {
          ssoEnabled: input.enabled,
          ssoProvider: input.provider,
          ssoEnforce: input.enforce || false,
          ssoSecretId: secretId,
          ssoMetadata: {
            entityId: input.config.entityId,
            ssoUrl: input.config.ssoUrl,
            sloUrl: input.config.sloUrl,
          } as any,
        },
      });

      log.info('SSO configuration created/updated', {
        organizationId: input.organizationId,
        provider: input.provider,
        secretId,
        service: 'auth',
      });

      return {
        ssoConfig,
        secretId,
      };
    } catch (error: any) {
      // Cleanup: If secret was created but database operations failed, try to delete the secret
      if (secretId) {
        try {
          await this.secretClient.deleteSSOSecret(secretId, input.organizationId);
          log.info('Cleaned up SSO secret after configuration failure', {
            organizationId: input.organizationId,
            secretId,
            service: 'auth',
          });
        } catch (cleanupError: any) {
          log.error('Failed to cleanup SSO secret after configuration failure', cleanupError, {
            organizationId: input.organizationId,
            secretId,
            service: 'auth',
          });
          // Continue to throw original error
        }
      }
      throw error;
    }
  }

  /**
   * Get SSO configuration (non-sensitive data only)
   */
  async getSSOConfiguration(organizationId: string, provider?: SSOProvider): Promise<any | null> {
    const db = getDatabaseClient() as any;

    const where: any = { organizationId };
    if (provider) {
      where.provider = provider;
    }

    const config = await db.sSOConfiguration.findFirst({
      where,
      include: {
        organization: {
          select: {
            ssoEnabled: true,
            ssoProvider: true,
            ssoEnforce: true,
          },
        },
      },
    });

    if (!config) {
      return null;
    }

    // Get certificate expiration info
    let certificateExpiration: any = undefined;
    try {
      if (config.secretId) {
        const expirationInfo = await this.getCertificateExpiration(config.secretId, organizationId);
        if (expirationInfo) {
          certificateExpiration = {
            expiresAt: expirationInfo.expiresAt,
            daysUntilExpiration: expirationInfo.daysUntilExpiration,
            isExpired: expirationInfo.isExpired,
            isExpiringSoon: expirationInfo.isExpiringSoon,
          };
        }
      }
    } catch (error: any) {
      log.warn('Failed to get certificate expiration info', {
        error: error.message,
        organizationId,
        secretId: config.secretId,
        service: 'auth',
      });
    }

    return {
      id: config.id,
      organizationId: config.organizationId,
      provider: config.provider,
      enabled: config.organization.ssoEnabled,
      enforce: config.organization.ssoEnforce,
      config: {
        provider: config.provider,
        entityId: config.entityId,
        ssoUrl: config.ssoUrl,
        sloUrl: config.sloUrl,
        nameIdFormat: config.nameIdFormat,
        authnContext: config.authnContext,
        attributeMappings: config.attributeMappings,
      },
      certificateExpiration,
      secretId: config.secretId,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Get SSO credentials from Secret Management Service (service-to-service only)
   */
  async getSSOCredentials(
    organizationId: string,
    serviceToken?: string,
    requestingService?: string
  ): Promise<{
    provider: string;
    credentials: SSOCredentials;
    config: SSOConfigurationData;
  }> {
    // Get SSO configuration to find secret ID
    const ssoConfig = await this.getSSOConfiguration(organizationId);
    if (!ssoConfig || !ssoConfig.secretId) {
      throw new Error('SSO not configured for this organization');
    }

    // Retrieve credentials from Secret Management Service
    try {
      const secret = await this.secretClient.getSSOSecret(ssoConfig.secretId, organizationId);

      // Log secret access for audit
      log.info('SSO credentials retrieved from Secret Management Service', {
        organizationId,
        secretId: ssoConfig.secretId,
        provider: ssoConfig.provider,
        service: 'auth',
      });

      return {
        provider: ssoConfig.provider,
        credentials: secret.credentials as SSOCredentials,
        config: ssoConfig.config,
      };
    } catch (error: any) {
      log.error('Failed to retrieve SSO credentials from Secret Management Service', {
        error: error.message,
        organizationId,
        secretId: ssoConfig.secretId,
        service: 'auth',
      });
      throw new Error('Failed to retrieve SSO credentials');
    }
  }

  /**
   * Disable SSO for organization
   */
  async disableSSO(organizationId: string, userId: string): Promise<void> {
    const db = getDatabaseClient() as any;

    await db.organization.update({
      where: { id: organizationId },
      data: {
        ssoEnabled: false,
        ssoProvider: null,
        ssoEnforce: false,
        ssoSecretId: null,
        ssoMetadata: null,
      },
    });

    // Mark SSO configurations as inactive
    await db.sSOConfiguration.updateMany({
      where: { organizationId },
      data: { isActive: false },
    });

    log.info('SSO disabled for organization', { organizationId, userId, service: 'auth' });
  }

  /**
   * Delete SSO configuration
   */
  async deleteSSOConfiguration(organizationId: string, provider: SSOProvider, userId: string): Promise<void> {
    const db = getDatabaseClient() as any;

    const config = await db.sSOConfiguration.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
    });

    if (!config) {
      throw new Error('SSO configuration not found');
    }

    // Delete secret from Secret Management Service
    try {
      await this.secretClient.deleteSSOSecret(config.secretId, organizationId);
      
      log.info('SSO secret deleted from Secret Management Service', {
        organizationId,
        secretId: config.secretId,
        service: 'auth',
      });
    } catch (error: any) {
      log.warn('Failed to delete SSO secret from Secret Management Service', {
        error: error.message,
        organizationId,
        secretId: config.secretId,
        service: 'auth',
      });
      // Continue with database deletion even if secret deletion fails
    }

    // Delete SSO configuration
    await db.sSOConfiguration.delete({
      where: { id: config.id },
    });

    // Update organization if this was the active SSO
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { ssoProvider: true },
    });

    if (org?.ssoProvider === provider) {
      await this.disableSSO(organizationId, userId);
    }

    log.info('SSO configuration deleted', { organizationId, provider, userId, service: 'auth' });
  }

  /**
   * Rotate SSO certificate
   */
  async rotateCertificate(
    organizationId: string,
    secretId: string,
    newCertificate: string,
    newPrivateKey?: string,
    gracePeriodHours?: number
  ): Promise<{
    secretId: string;
    rotatedAt: string;
    gracePeriodEndsAt?: string;
  }> {
    try {
      const response = await this.secretClient.rotateSSOCertificate(secretId, {
        newCertificate,
        newPrivateKey,
        gracePeriodHours,
      }, organizationId);

      log.info('SSO certificate rotated', {
        organizationId,
        secretId,
        rotatedAt: response.rotatedAt,
        service: 'auth',
      });

      return response;
    } catch (error: any) {
      log.error('Failed to rotate SSO certificate', {
        error: error.message,
        organizationId,
        secretId,
        service: 'auth',
      });
      throw new Error('Failed to rotate SSO certificate');
    }
  }

  /**
   * Get certificate expiration information
   */
  async getCertificateExpiration(
    secretId: string,
    organizationId?: string
  ): Promise<{
    expiresAt?: string;
    daysUntilExpiration?: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  } | null> {
    try {
      const response = await this.secretClient.getCertificateExpiration(secretId, organizationId);
      return response;
    } catch (error: any) {
      log.warn('Failed to get certificate expiration', {
        error: error.message,
        secretId,
        organizationId,
        service: 'auth',
      });
      return null;
    }
  }

  /**
   * Store SSO credentials in Secret Management Service
   */
  private async storeSSOCredentials(
    organizationId: string,
    provider: SSOProvider,
    credentials: SSOCredentials,
    createdBy: string
  ): Promise<string> {
    try {
      const response = await this.secretClient.createSSOSecret({
        organizationId,
        provider,
        credentials: credentials as ClientSSOCredentials,
      });

      // Log secret access for audit
      log.info('SSO credentials stored in Secret Management Service', {
        organizationId,
        provider,
        secretId: response.secretId,
        service: 'auth',
      });

      return response.secretId;
    } catch (error: any) {
      log.error('Failed to store SSO credentials in Secret Management Service', {
        error: error.message,
        organizationId,
        provider,
        service: 'auth',
      });
      throw new Error('Failed to store SSO credentials');
    }
  }
}

// Singleton instance
let ssoConfigServiceInstance: SSOConfigurationService | null = null;

/**
 * Get the SSO configuration service instance
 */
export function getSSOConfigurationService(): SSOConfigurationService {
  if (!ssoConfigServiceInstance) {
    ssoConfigServiceInstance = new SSOConfigurationService();
  }
  return ssoConfigServiceInstance;
}

