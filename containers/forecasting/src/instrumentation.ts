/**
 * Application Insights (Plan §8.5.1, FIRST_STEPS §1).
 * Must run before other imports that make network calls.
 * Uses env: APPLICATIONINSIGHTS_CONNECTION_STRING, APPLICATIONINSIGHTS_DISABLE.
 */

import { useAzureMonitor } from '@azure/monitor-opentelemetry';

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '';
const disable = process.env.APPLICATIONINSIGHTS_DISABLE === 'true' || process.env.APPLICATIONINSIGHTS_DISABLE === '1';

if (!disable && connectionString) {
  useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
}
