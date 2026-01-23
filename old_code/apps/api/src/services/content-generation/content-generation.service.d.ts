import { IMonitoringProvider } from '@castiel/monitoring';
import { TemplateService } from './template.service.js';
import { InsightService } from '../insight.service.js';
import { ShardRepository } from '../../repositories/shard.repository.js';
import { ConversionService } from './conversion.service.js';
export declare class ContentGenerationService {
    private monitoring;
    private templateService;
    private insightService;
    private shardRepository;
    private conversionService?;
    constructor(monitoring: IMonitoringProvider, templateService: TemplateService, insightService: InsightService, shardRepository: ShardRepository, conversionService?: ConversionService | undefined);
    /**
     * Generate a document from a template
     */
    generateDocument(tenantId: string, userId: string, templateId: string, context: {
        projectId?: string;
        variables?: Record<string, string>;
    }): Promise<{
        content: string;
        shardId: string;
    }>;
    /**
     * Generate content from a prompt (direct generation, not template-based)
     */
    generateContent(prompt: string, _connection: any, _apiKey: string, options?: {
        temperature?: number;
        templateId?: string;
        tenantId?: string;
        userId?: string;
        variables?: Record<string, string>;
        format?: 'html' | 'pdf' | 'docx' | 'pptx';
    }): Promise<string | Buffer>;
}
//# sourceMappingURL=content-generation.service.d.ts.map