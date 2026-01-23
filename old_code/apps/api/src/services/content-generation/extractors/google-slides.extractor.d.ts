/**
 * Google Slides Document Extractor
 *
 * Extracts placeholders from Google Slides presentations using Google Slides API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import { ExtractionRequest, DocumentParseResult } from '../types/extraction.types.js';
export declare class GoogleSlidesExtractor extends BaseDocumentExtractor {
    private slidesClient;
    private driveClient;
    private oauth2Client;
    constructor(monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService);
    /**
     * Initialize Google API clients
     */
    private initializeClients;
    /**
     * Get document metadata
     */
    getDocumentMetadata(documentId: string, auth: DocumentAuthToken): Promise<DocumentMetadata>;
    /**
     * Parse document and extract text content
     */
    parseDocument(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<DocumentParseResult>;
    /**
     * Extract colors from presentation theme
     */
    protected extractColors(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<string[]>;
    /**
     * Extract text from shape text element
     */
    private extractTextFromShape;
    /**
     * Extract text from table
     */
    private extractTextFromTable;
    /**
     * Extract text from page elements (for notes)
     */
    private extractTextFromPageElements;
    /**
     * Get element type from page element
     */
    private getElementType;
    /**
     * Extract style from shape
     */
    private extractStyle;
    /**
     * Convert RGB color to hex
     */
    private rgbToHex;
}
//# sourceMappingURL=google-slides.extractor.d.ts.map