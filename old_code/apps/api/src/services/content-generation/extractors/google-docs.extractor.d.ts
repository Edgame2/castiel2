/**
 * Google Docs Document Extractor
 *
 * Extracts placeholders from Google Docs documents using Google Docs API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import { ExtractionRequest, DocumentParseResult } from '../types/extraction.types.js';
export declare class GoogleDocsExtractor extends BaseDocumentExtractor {
    private docsClient;
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
     * Extract colors from document theme
     */
    protected extractColors(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<string[]>;
    /**
     * Extract text from paragraph
     */
    private extractTextFromParagraph;
    /**
     * Extract text from table
     */
    private extractTextFromTable;
    /**
     * Extract text from cell content (array of structural elements)
     */
    private extractTextFromCellContent;
    /**
     * Extract style from paragraph
     */
    private extractStyleFromParagraph;
    /**
     * Convert RGB color to hex
     */
    private rgbToHex;
}
//# sourceMappingURL=google-docs.extractor.d.ts.map