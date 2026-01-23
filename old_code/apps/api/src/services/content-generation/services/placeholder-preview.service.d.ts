/**
 * Placeholder Preview Service
 *
 * Generates preview/test content for individual placeholders using AI Insights
 * MANDATORY: Must use InsightService.generate() for placeholder content generation
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { InsightService } from '../../insight.service.js';
import { ContextTemplateService } from '../../context-template.service.js';
import { DocumentTemplateService } from './document-template.service.js';
import { PlaceholderPreviewRequest, PlaceholderPreviewResult, PlaceholderValidationResult } from '../types/placeholder.types.js';
export declare class PlaceholderPreviewService {
    private monitoring;
    private insightService;
    private contextTemplateService;
    private templateService;
    constructor(monitoring: IMonitoringProvider, insightService: InsightService, contextTemplateService: ContextTemplateService, templateService: DocumentTemplateService);
    /**
     * Test/preview generation for a single placeholder
     * MANDATORY: Uses InsightService.generate() for AI content generation
     */
    testPlaceholderGeneration(tenantId: string, userId: string, request: PlaceholderPreviewRequest): Promise<PlaceholderPreviewResult>;
    /**
     * Validate all placeholders in a template
     */
    validateAllPlaceholders(templateId: string, tenantId: string): Promise<PlaceholderValidationResult>;
    /**
     * Build prompt from placeholder configuration
     * MANDATORY: Must include description, tone, constraints
     */
    private buildPromptFromConfig;
    /**
     * Assemble context from context template
     * Uses ContextTemplateService to traverse relationships
     * Returns the shardId to use for scoping the generation
     */
    private assembleContextFromTemplate;
    /**
     * Get max tokens for placeholder type
     */
    private getMaxTokensForType;
    /**
     * Validate generated content against constraints
     */
    private validateGeneratedContent;
}
//# sourceMappingURL=placeholder-preview.service.d.ts.map