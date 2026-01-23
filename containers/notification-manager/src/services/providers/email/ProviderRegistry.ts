/**
 * Email Provider Registry
 * 
 * Manages email provider instances and provides singleton access
 */

import { IEmailProvider } from './IEmailProvider';
import { createEmailProvider, EmailProviderConfig } from './ProviderFactory';
import { SecretManagementClient } from '../../SecretManagementClient';
import { getConfig } from '../../../config';

export class ProviderRegistry {
  private static emailProvider: IEmailProvider | null = null;
  private static secretClient: SecretManagementClient | null = null;

  /**
   * Get or create the email provider instance
   */
  static async getEmailProvider(): Promise<IEmailProvider> {
    if (this.emailProvider) {
      return this.emailProvider;
    }

    const config = getConfig();
    const emailConfig = config.notification.providers.email;

    if (!emailConfig || !emailConfig.enabled) {
      throw new Error('Email provider is not enabled in configuration');
    }

    const secretClient = this.getSecretClient();
    
    const providerConfig: EmailProviderConfig = {
      provider: emailConfig.provider || 'smtp',
      secret_id: emailConfig.secret_id || undefined,
      from_address: emailConfig.from_address,
      from_name: emailConfig.from_name,
    };

    this.emailProvider = await createEmailProvider(providerConfig, secretClient);
    return this.emailProvider;
  }

  /**
   * Get or create the secret management client
   */
  static getSecretClient(): SecretManagementClient {
    if (!this.secretClient) {
      this.secretClient = new SecretManagementClient();
    }
    return this.secretClient;
  }

  /**
   * Reset provider (useful for testing or reconfiguration)
   */
  static reset(): void {
    this.emailProvider = null;
    this.secretClient = null;
  }

  /**
   * Clear secret cache (useful after secret rotation)
   */
  static clearSecretCache(secretId?: string): void {
    const client = this.secretClient;
    if (client) {
      if (secretId) {
        client.clearCache(secretId);
      } else {
        client.clearAllCache();
      }
    }
  }
}

