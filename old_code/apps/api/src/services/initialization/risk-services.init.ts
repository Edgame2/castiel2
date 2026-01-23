/**
 * Risk Analysis Services Initialization
 * Initializes risk evaluation, catalog, and analysis services
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface RiskServicesResult {
  riskEvaluationService?: any;
  riskCatalogService?: any;
  riskAnalysisToolService?: any;
  revenueAtRiskService?: any;
}

/**
 * Initialize risk analysis services
 */
export async function initializeRiskServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<RiskServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: RiskServicesResult = {};

  try {
    // Risk services are typically initialized in routes/index.ts
    // This module provides a structure for extracting risk service initialization
    result.riskEvaluationService = (server as any).riskEvaluationService;
    result.riskCatalogService = (server as any).riskCatalogService;
    result.riskAnalysisToolService = (server as any).riskAnalysisToolService;
    result.revenueAtRiskService = (server as any).revenueAtRiskService;

    if (result.riskEvaluationService) {
      server.log.info('✅ Risk Analysis Services available');
    } else {
      server.log.warn('⚠️ Risk Analysis Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Risk Services initialization check failed');
  }

  return result;
}
