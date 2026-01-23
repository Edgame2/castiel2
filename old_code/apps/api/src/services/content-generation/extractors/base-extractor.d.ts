/**
 * Base Document Extractor
 *
 * Abstract base class for format-specific document extractors
 * All extractors must implement this interface
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ExtractionRequest, ExtractionResult, DocumentParseResult, PlaceholderMatch, PlaceholderLocation } from '../types/extraction.types.js';
import { PlaceholderDefinition, PlaceholderType } from '../types/template.types.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
/**
 * Authentication token for document access
 */
export interface DocumentAuthToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    userId?: string;
    tenantId?: string;
}
/**
 * Document metadata
 */
export interface DocumentMetadata {
    id: string;
    name: string;
    format: string;
    url?: string;
    modifiedTime?: Date;
    size?: number;
    mimeType?: string;
}
/**
 * Base class for all document extractors
 */
export declare abstract class BaseDocumentExtractor {
    protected monitoring: IMonitoringProvider;
    protected extractionService: PlaceholderExtractionService;
    constructor(monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService);
    /**
     * Extract placeholders from document
     * This is the main entry point - delegates to format-specific implementation
     */
    extractPlaceholders(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<ExtractionResult>;
    /**
     * Get document metadata (format-specific)
     */
    abstract getDocumentMetadata(documentId: string, auth: DocumentAuthToken): Promise<DocumentMetadata>;
    /**
     * Parse document and extract text content (format-specific)
     */
    abstract parseDocument(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<DocumentParseResult>;
    /**
     * Extract colors from document (format-specific)
     * Default implementation returns empty array
     */
    protected extractColors(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<string[]>;
    /**
     * Extract placeholder matches using regex (shared logic)
     * MANDATORY: Uses regex pattern /\{\{([^}]+)\}\}/g
     */
    protected extractPlaceholderMatches(text: string, elements: any[]): PlaceholderMatch[];
    /**
     * Deduplicate placeholders (shared logic)
     */
    protected deduplicatePlaceholders(matches: PlaceholderMatch[], elements: any[]): {
        uniquePlaceholders: string[];
        locationMap: Map<string, PlaceholderLocation[]>;
    };
    /**
     * Create placeholder definitions (shared logic)
     */
    protected createPlaceholderDefinitions(uniquePlaceholders: string[], locationMap: Map<string, PlaceholderLocation[]>): PlaceholderDefinition[];
    /**
     * Infer placeholder type from name and context
     */
    protected inferPlaceholderType(name: string, context?: string): PlaceholderType;
}
//# sourceMappingURL=base-extractor.d.ts.map