/**
 * Azure Application Insights – must run before other imports that do I/O.
 * Per BI_SALES_RISK_IMPLEMENTATION_PLAN §8.5.1 and ModuleImplementationGuide.
 */

import { useAzureMonitor } from '@azure/monitor-opentelemetry';

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '';
const disable = process.env.APPLICATIONINSIGHTS_DISABLE === 'true' || process.env.APPLICATIONINSIGHTS_DISABLE === '1';

if (!disable && connectionString) {
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString },
  });
}
