/**
 * Pipeline API Routes
 * REST endpoints for pipeline views, analytics, forecasting, and summaries
 */
import type { FastifyInstance } from 'fastify';
import { PipelineViewService } from '../services/pipeline-view.service.js';
import { PipelineAnalyticsService } from '../services/pipeline-analytics.service.js';
import { PipelineSummaryService } from '../services/pipeline-summary.service.js';
import { RevenueForecastService } from '../services/revenue-forecast.service.js';
interface PipelineRoutesOptions {
    pipelineViewService: PipelineViewService;
    pipelineAnalyticsService: PipelineAnalyticsService;
    pipelineSummaryService: PipelineSummaryService;
    revenueForecastService: RevenueForecastService;
}
/**
 * Register pipeline routes
 */
export declare function registerPipelineRoutes(server: FastifyInstance, options: PipelineRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=pipeline.routes.d.ts.map