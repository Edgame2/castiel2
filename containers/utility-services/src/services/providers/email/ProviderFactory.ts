/**
 * Email Provider Factory
 * 
 * Creates email provider instances based on configuration
 * Follows ModuleImplementationGuide Section 6.4
 */

import { IEmailProvider } from './IEmailProvider';
import { SendGridProvider, SendGridConfig } from './SendGridProvider';
import { SMTPProvider, SMTPConfig } from './SMTPProvider';
import { SESProvider, SESConfig } from './SESProvider';
import { SecretManagementClient } from '../../SecretManagementClient';
import { getConfig } from '../../../config';

export interface EmailProviderConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  secret_id?: string | null;
  from_address?: string;
  from_name?: string;
  // SMTP-specific
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  // SES-specific
  region?: string;
  access_key_id?: string;
  secret_access_key?: string;
}

/**
 * Create email provider based on configuration
 */
export async function createEmailProvider(
  config: EmailProviderConfig,
  secretClient?: SecretManagementClient
): Promise<IEmailProvider> {
  const appConfig = getConfig();
  const defaultFrom = config.from_address || appConfig.notification?.providers?.email?.from_address || 'noreply@castiel';
  const defaultFromName = config.from_name || appConfig.notification?.providers?.email?.from_name || 'Castiel';

  switch (config.provider) {
    case 'sendgrid': {
      if (!config.secret_id) {
        throw new Error('SendGrid provider requires secret_id in configuration');
      }

      const client = secretClient || new SecretManagementClient();
      const apiKey = await client.getSecretValue(config.secret_id);
      
      if (typeof apiKey !== 'string') {
        throw new Error('SendGrid API key must be a string');
      }

      return new SendGridProvider({
        apiKey,
        defaultFrom,
        defaultFromName,
      });
    }

    case 'ses': {
      if (!config.secret_id) {
        throw new Error('AWS SES provider requires secret_id in configuration');
      }

      const client = secretClient || new SecretManagementClient();
      const secret = await client.getSecretValue(config.secret_id);
      
      // Secret can be a JSON object with accessKeyId and secretAccessKey
      let accessKeyId: string;
      let secretAccessKey: string;
      
      if (typeof secret === 'object' && secret !== null) {
        accessKeyId = (secret as any).accessKeyId || (secret as any).access_key_id;
        secretAccessKey = (secret as any).secretAccessKey || (secret as any).secret_access_key;
      } else if (typeof secret === 'string') {
        // If it's a JSON string, parse it
        try {
          const parsed = JSON.parse(secret);
          accessKeyId = parsed.accessKeyId || parsed.access_key_id;
          secretAccessKey = parsed.secretAccessKey || parsed.secret_access_key;
        } catch {
          throw new Error('AWS SES secret must be a JSON object with accessKeyId and secretAccessKey');
        }
      } else {
        throw new Error('AWS SES secret must be a JSON object with accessKeyId and secretAccessKey');
      }

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS SES secret must contain accessKeyId and secretAccessKey');
      }

      return new SESProvider({
        region: config.region || process.env.AWS_SES_REGION || 'us-east-1',
        accessKeyId,
        secretAccessKey,
        defaultFrom,
        defaultFromName,
      });
    }

    case 'smtp': {
      // SMTP can use secrets or direct config
      let smtpUser: string | undefined;
      let smtpPassword: string | undefined;

      if (config.secret_id) {
        const client = secretClient || new SecretManagementClient();
        const secret = await client.getSecretValue(config.secret_id);
        
        if (typeof secret === 'object' && secret !== null) {
          smtpUser = (secret as any).user || (secret as any).username;
          smtpPassword = (secret as any).password;
        } else if (typeof secret === 'string') {
          try {
            const parsed = JSON.parse(secret);
            smtpUser = parsed.user || parsed.username;
            smtpPassword = parsed.password;
          } catch {
            // If not JSON, treat as password only
            smtpPassword = secret;
          }
        }
      } else {
        // Fallback to direct config or env vars
        smtpUser = config.user || process.env.SMTP_USER;
        smtpPassword = config.password || process.env.SMTP_PASSWORD;
      }

      const smtpHost = config.host || process.env.SMTP_HOST;
      if (!smtpHost) {
        throw new Error('SMTP provider requires host in configuration or SMTP_HOST environment variable');
      }

      const smtpPort = config.port || parseInt(process.env.SMTP_PORT || '587', 10);
      const smtpSecure = config.secure !== undefined 
        ? config.secure 
        : process.env.SMTP_SECURE === 'true' || smtpPort === 465;

      return new SMTPProvider({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser,
        password: smtpPassword,
        defaultFrom,
        defaultFromName,
      });
    }

    default:
      throw new Error(`Unknown email provider: ${config.provider}`);
  }
}

