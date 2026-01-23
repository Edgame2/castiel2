/**
 * SIEM Provider Factory
 * Per ModuleImplementationGuide Section 6.4: Provider Factories
 */

import { ISIEMProvider, SIEMProviderConfig } from './ISIEMProvider';
import { WebhookSIEMProvider } from './WebhookSIEMProvider';
import { SplunkSIEMProvider } from './SplunkSIEMProvider';
import { DatadogSIEMProvider } from './DatadogSIEMProvider';
import { log } from '../../../utils/logger';

/**
 * Factory function to create SIEM providers based on configuration
 */
export function createSIEMProvider(config: SIEMProviderConfig): ISIEMProvider {
  log.info('Creating SIEM provider', { provider: config.provider });
  
  switch (config.provider) {
    case 'webhook':
      return new WebhookSIEMProvider(config);
    
    case 'splunk':
      if (!config.splunk?.url || !config.splunk?.token) {
        throw new Error('Splunk SIEM provider requires URL and token configuration');
      }
      return new SplunkSIEMProvider(config);
    
    case 'datadog':
      if (!config.datadog?.apiKey) {
        throw new Error('Datadog SIEM provider requires API key configuration');
      }
      return new DatadogSIEMProvider(config);
    
    default:
      throw new Error(`Unknown SIEM provider: ${config.provider}`);
  }
}

