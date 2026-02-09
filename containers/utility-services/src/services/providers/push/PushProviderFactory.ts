/**
 * Push Provider Factory
 */

import { IPushProvider } from './IPushProvider';
import { FCMProvider } from './FCMProvider';
import { SecretManagementClient } from '../../SecretManagementClient';

export interface PushProviderConfig {
  provider: 'firebase' | 'onesignal';
  secret_id?: string | null;
}

export async function createPushProvider(
  config: PushProviderConfig,
  secretClient?: SecretManagementClient
): Promise<IPushProvider> {
  switch (config.provider) {
    case 'firebase': {
      if (!config.secret_id) {
        throw new Error('Firebase provider requires secret_id in configuration');
      }

      const client = secretClient || new SecretManagementClient();
      const secret = await client.getSecretValue(config.secret_id);
      
      // Secret should be Firebase service account JSON
      let serviceAccountKey: string | Record<string, any>;
      
      if (typeof secret === 'object' && secret !== null) {
        serviceAccountKey = secret;
      } else if (typeof secret === 'string') {
        try {
          serviceAccountKey = JSON.parse(secret);
        } catch {
          throw new Error('Firebase secret must be a valid JSON service account key');
        }
      } else {
        throw new Error('Firebase secret must be a JSON object or JSON string');
      }

      return new FCMProvider({
        serviceAccountKey,
      });
    }

    case 'onesignal':
      // OneSignal provider: add when implemented
      throw new Error('OneSignal provider not yet implemented');

    default:
      throw new Error(`Unknown push provider: ${config.provider}`);
  }
}

