/**
 * Analytics Services Initialization
 * Initializes analytics and reporting services (dashboards, quotas, pipeline, benchmarks)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface AnalyticsServicesResult {
  managerDashboardService?: any;
  quotaService?: any;
  pipelineViewService?: any;
  pipelineAnalyticsService?: any;
  benchmarkingService?: any;
  revenueAtRiskService?: any;
}

/**
 * Initialize analytics services
 */
export async function initializeAnalyticsServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<AnalyticsServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: AnalyticsServicesResult = {};

  try {
    // Analytics services are typically initialized in routes/index.ts
    // This module provides a structure for extracting analytics service initialization
    result.managerDashboardService = (server as any).managerDashboardService;
    result.quotaService = (server as any).quotaService;
    result.pipelineViewService = (server as any).pipelineViewService;
    result.pipelineAnalyticsService = (server as any).pipelineAnalyticsService;
    result.benchmarkingService = (server as any).benchmarkingService;
    result.revenueAtRiskService = (server as any).revenueAtRiskService;

    if (result.managerDashboardService || result.quotaService) {
      server.log.info('✅ Analytics Services available');
    } else {
      server.log.warn('⚠️ Analytics Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Analytics Services initialization check failed');
  }

  return result;
}
