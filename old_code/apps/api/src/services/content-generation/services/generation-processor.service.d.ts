/**
 * Generation Processor Service
 *
 * Orchestrates the complete document generation process:
 * 1. Generate placeholder content using AI
 * 2. Duplicate source document
 * 3. Replace placeholders in document
 * 4. Insert charts (if any)
 * 5. Create c_document Shard
 *
 * This service is used by Container App workers to process generation jobs
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { DocumentTemplateService } from './document-template.service.js';
import { DocumentRewriterFactory } from '../rewriters/rewriter-factory.js';
import { InsightService } from '../../insight.service.js';
import { ContextTemplateService } from '../../context-template.service.js';
import { ShardRepository } from '../../../repositories/shard.repository.js';
import type { NotificationService } from '../../notification.service.js';
import { GenerationJob, GenerationResult } from '../types/generation.types.js';
import { DocumentTemplate } from '../types/template.types.js';
export declare class GenerationProcessorService {
    private monitoring;
    private templateService;
    private rewriterFactory;
    private insightService;
    private contextTemplateService;
    private shardRepository;
    private notificationService?;
    private jobRepository;
    private chartGenerationService;
    private encryptionService;
    private config;
    constructor(monitoring: IMonitoringProvider, templateService: DocumentTemplateService, rewriterFactory: DocumentRewriterFactory, insightService: InsightService, contextTemplateService: ContextTemplateService, shardRepository: ShardRepository, notificationService?: NotificationService | undefined);
    /**
     * Process a generation job
     * This is the main entry point for processing generation jobs from Service Bus
     */
    processJob(job: GenerationJob & {
        template?: DocumentTemplate;
        userToken?: string;
    }): Promise<GenerationResult>;
    /**
     * Generate content for a single placeholder
     */
    private generatePlaceholderContent;
    /**
     * Validate generated content against placeholder constraints
     */
    private validateGeneratedContent;
    /**
     * Build prompt from placeholder configuration
     */
    private buildPromptFromConfig;
    /**
     * Assemble context from context template
     * Returns the shardId to use for scoping the generation
     */
    private assembleContextFromTemplate;
    /**
     * Get max tokens for placeholder type
     */
    private getMaxTokensForType;
    /**
     * Parse auth token from job
     */
    /**
     * Parse auth token from job
     * Decrypts the token if it's encrypted
     */
    private parseAuthToken;
    /**
     * Get MIME type for document format
     */
    private getMimeTypeForFormat;
    /**
     * Determine if an error is recoverable (should retry) or permanent (should fail immediately)
     */
    private isRecoverableError;
    /**
     * Extract error code from error
     */
    private getErrorCode;
}
//# sourceMappingURL=generation-processor.service.d.ts.map