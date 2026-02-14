/**
 * SSO Configuration Service
 * 
 * Manages SSO configuration for tenants, integrating with Secret Management Service
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
  tenantId: string;
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
        input.tenantId,
        input.provider,
        input.credentials,
        input.createdBy
      );

      // 2. Store non-sensitive configuration in database
      const ssoConfig = await db.sSOConfiguration.upsert({
        where: {
          organizationId_provider: {
            organizationId: input.tenantId,
            provider: input.provider,
          },
        },
        create: {
          organizationId: input.tenantId,
          provider: input.provider,
          entityId: input.config.entityId,
          ssoUrl: input.config.ssoUrl,
          sloUrl: input.config.sloUrl,
          nameIdFormat: input.config.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          authnContext: input.config.authnContext,
          attributeMappings: input.config.attributeMappings as any,
          secretId,
          isActive: input.enabled,
          ssoEnforce: input.enforce || false,
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
          isActive: input.enabled,
          ssoEnforce: input.enforce ?? false,
          updatedAt: new Date(),
        },
      });

      log.info('SSO configuration created/updated', {
        tenantId: input.tenantId,
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
          await this.secretClient.deleteSSOSecret(secretId, input.tenantId);
          log.info('Cleaned up SSO secret after configuration failure', {
            tenantId: input.tenantId,
            secretId,
            service: 'auth',
          });
        } catch (cleanupError: any) {
          log.error('Failed to cleanup SSO secret after configuration failure', cleanupError, {
            tenantId: input.tenantId,
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
  async getSSOConfiguration(tenantId: string, provider?: SSOProvider): Promise<any | null> {
    const db = getDatabaseClient() as any;

    const where: any = { organizationId: tenantId };
    if (provider) {
      where.provider = provider;
    }

    const config = await db.sSOConfiguration.findFirst({
      where,
    });

    if (!config) {
      return null;
    }

    let certificateExpiration: any = undefined;
    try {
      if (config.secretId) {
        const expirationInfo = await this.getCertificateExpiration(config.secretId, tenantId);
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
        tenantId,
        secretId: config.secretId,
        service: 'auth',
      });
    }

    const c = config as { ssoEnforce?: boolean };
    return {
      id: config.id,
      organizationId: config.organizationId,
      tenantId: config.organizationId,
      provider: config.provider,
      enabled: config.isActive,
      enforce: c.ssoEnforce ?? false,
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
    tenantId: string,
    serviceToken?: string,
    requestingService?: string
  ): Promise<{
    provider: string;
    credentials: SSOCredentials;
    config: SSOConfigurationData;
  }> {
    // Get SSO configuration to find secret ID
    const ssoConfig = await this.getSSOConfiguration(tenantId);
    if (!ssoConfig || !ssoConfig.secretId) {
      throw new Error('SSO not configured for this organization');
    }

    // Retrieve credentials from Secret Management Service
    try {
      const secret = await this.secretClient.getSSOSecret(ssoConfig.secretId, tenantId);

      log.info('SSO credentials retrieved from Secret Management Service', {
        tenantId,
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
        tenantId,
        secretId: ssoConfig.secretId,
        service: 'auth',
      });
      throw new Error('Failed to retrieve SSO credentials');
    }
  }

  /**
   * Disable SSO for tenant
   */
  async disableSSO(tenantId: string, userId: string): Promise<void> {
    const db = getDatabaseClient() as any;

    await db.sSOConfiguration.updateMany({
      where: { organizationId: tenantId },
      data: { isActive: false },
    });

    log.info('SSO disabled for tenant', { tenantId, userId, service: 'auth' });
  }

  /**
   * Delete SSO configuration
   */
  async deleteSSOConfiguration(tenantId: string, provider: SSOProvider, userId: string): Promise<void> {
    const db = getDatabaseClient() as any;

    const config = await db.sSOConfiguration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: tenantId,
          provider,
        },
      },
    });

    if (!config) {
      throw new Error('SSO configuration not found');
    }

    try {
      await this.secretClient.deleteSSOSecret(config.secretId, tenantId);
      log.info('SSO secret deleted from Secret Management Service', {
        tenantId,
        secretId: config.secretId,
        service: 'auth',
      });
    } catch (error: any) {
      log.warn('Failed to delete SSO secret from Secret Management Service', {
        error: error.message,
        tenantId,
        secretId: config.secretId,
        service: 'auth',
      });
    }

    await db.sSOConfiguration.delete({
      where: { id: config.id },
    });

    log.info('SSO configuration deleted', { tenantId, provider, userId, service: 'auth' });
  }

  /**
   * Rotate SSO certificate
   */
  async rotateCertificate(
    tenantId: string,
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
      }, tenantId);

      log.info('SSO certificate rotated', {
        tenantId,
        secretId,
        rotatedAt: response.rotatedAt,
        service: 'auth',
      });

      return response;
    } catch (error: any) {
      log.error('Failed to rotate SSO certificate', {
        error: error.message,
        tenantId,
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
    tenantId?: string
  ): Promise<{
    expiresAt?: string;
    daysUntilExpiration?: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  } | null> {
    try {
      const response = await this.secretClient.getCertificateExpiration(secretId, tenantId);
      return response;
    } catch (error: any) {
      log.warn('Failed to get certificate expiration', {
        error: error.message,
        secretId,
        tenantId,
        service: 'auth',
      });
      return null;
    }
  }

  /**
   * Store SSO credentials in Secret Management Service
   */
  private async storeSSOCredentials(
    tenantId: string,
    provider: SSOProvider,
    credentials: SSOCredentials,
    createdBy: string
  ): Promise<string> {
    try {
      const response = await this.secretClient.createSSOSecret({
        tenantId,
        provider,
        credentials: credentials as ClientSSOCredentials,
      });

      log.info('SSO credentials stored in Secret Management Service', {
        tenantId,
        provider,
        secretId: response.secretId,
        service: 'auth',
      });

      return response.secretId;
    } catch (error: any) {
      log.error('Failed to store SSO credentials in Secret Management Service', {
        error: error.message,
        tenantId,
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

