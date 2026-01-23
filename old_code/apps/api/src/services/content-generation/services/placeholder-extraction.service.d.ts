/**
 * Placeholder Extraction Service
 *
 * Extracts placeholders from documents using regex pattern: /\{\{([^}]+)\}\}/g
 * MANDATORY: Must use this exact regex pattern for all document formats
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ExtractionRequest, ExtractionResult, PlaceholderMatch, DocumentElement, DeduplicationResult } from '../types/extraction.types.js';
import { DocumentAuthToken } from '../extractors/base-extractor.js';
export declare class PlaceholderExtractionService {
    private monitoring;
    private config;
    private extractorFactory;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Extract placeholders from document
     * MANDATORY: Uses regex pattern /\{\{([^}]+)\}\}/g
     *
     * @param request Extraction request
     * @param auth Optional auth token (if not provided, will need to be retrieved from integration system)
     */
    extractPlaceholders(request: ExtractionRequest, auth?: DocumentAuthToken): Promise<ExtractionResult>;
    /**
     * Parse document (format-specific)
     * This method is now deprecated - use DocumentExtractorFactory instead
     * Kept for backward compatibility
     */
    private parseDocument;
    /**
     * Extract placeholder matches using regex
     * MANDATORY: Uses pattern /\{\{([^}]+)\}\}/g
     * Public method for use by extractors
     */
    extractPlaceholderMatches(textContent: string, elements: DocumentElement[]): PlaceholderMatch[];
    /**
     * Deduplicate placeholders (same name = one definition)
     * Public method for use by extractors
     */
    deduplicatePlaceholders(matches: PlaceholderMatch[], elements: DocumentElement[]): DeduplicationResult;
    /**
     * Find element for a match
     */
    private findElementForMatch;
    /**
     * Create placeholder definitions from unique placeholders
     */
    private createPlaceholderDefinitions;
    /**
     * Infer placeholder type from name
     */
    private inferPlaceholderType;
    /**
     * Extract colors from document
     *
     * Note: This is the legacy path. The modern path uses format-specific extractors
     * which already implement color extraction. This method provides a fallback
     * default color palette when auth is not available.
     */
    private extractColors;
}
//# sourceMappingURL=placeholder-extraction.service.d.ts.map