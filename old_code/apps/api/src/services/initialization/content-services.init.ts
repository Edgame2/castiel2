/**
 * Content Services Initialization
 * Initializes content-related services (document templates, content generation, templates)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface ContentServicesResult {
  documentTemplateService?: any;
  documentTemplateController?: any;
  templateService?: any;
  templateController?: any;
  contentGenerationService?: any;
  contentGenerationController?: any;
  conversionService?: any;
  placeholderPreviewService?: any;
  documentGenerationService?: any;
}

/**
 * Initialize content services
 */
export async function initializeContentServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<ContentServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: ContentServicesResult = {};

  try {
    // Content services are typically initialized in routes/index.ts
    // This module provides a structure for extracting content service initialization
    result.documentTemplateService = (server as any).documentTemplateService;
    result.documentTemplateController = (server as any).documentTemplateController;
    result.templateService = (server as any).templateService;
    result.templateController = (server as any).templateController;
    result.contentGenerationService = (server as any).contentGenerationService;
    result.contentGenerationController = (server as any).contentGenerationController;
    result.conversionService = (server as any).conversionService;
    result.placeholderPreviewService = (server as any).placeholderPreviewService;
    result.documentGenerationService = (server as any).documentGenerationService;

    if (result.documentTemplateService || result.templateService) {
      server.log.info('✅ Content Services available');
    } else {
      server.log.warn('⚠️ Content Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Content Services initialization check failed');
  }

  return result;
}
