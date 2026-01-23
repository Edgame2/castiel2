/**
 * Document Extractor Factory
 *
 * Creates the appropriate extractor based on document format
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor } from './base-extractor.js';
import { ExtractionRequest } from '../types/extraction.types.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
/**
 * Factory for creating document extractors
 */
export declare class DocumentExtractorFactory {
    private monitoring;
    private extractionService;
    private extractors;
    constructor(monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService);
    /**
     * Register an extractor for a specific format
     */
    registerExtractor(format: string, extractorClass: new (monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService) => BaseDocumentExtractor): void;
    /**
     * Create extractor for document format
     */
    createExtractor(format: ExtractionRequest['documentFormat']): Promise<BaseDocumentExtractor>;
    /**
     * Lazy load extractor based on format
     */
    private loadExtractor;
    /**
     * Check if extractor is available for format
     */
    isExtractorAvailable(format: string): boolean;
}
//# sourceMappingURL=extractor-factory.d.ts.map