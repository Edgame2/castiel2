/**
 * Microsoft Word Document Extractor
 *
 * Extracts placeholders from Microsoft Word documents stored in OneDrive
 * Uses Microsoft Graph API to download and parse .docx files
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import { ExtractionRequest, DocumentParseResult } from '../types/extraction.types.js';
export declare class MicrosoftWordExtractor extends BaseDocumentExtractor {
    private graphApiBaseUrl;
    constructor(monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService);
    /**
     * Get document metadata from Microsoft Graph API
     */
    getDocumentMetadata(documentId: string, auth: DocumentAuthToken): Promise<DocumentMetadata>;
    /**
     * Download document from OneDrive
     */
    private downloadDocument;
    /**
     * Parse Word document and extract text content
     *
     * Parses .docx files (ZIP archives containing XML files) to extract text and placeholders.
     * Structure:
     * - word/document.xml: Main document content
     * - word/header*.xml: Header content
     * - word/footer*.xml: Footer content
     */
    parseDocument(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<DocumentParseResult>;
    /**
     * Extract text from Word XML structure
     * Word XML uses w: namespace for elements (w:p for paragraphs, w:t for text)
     */
    private extractTextFromWordXml;
    /**
     * Extract text from a Word paragraph (w:p element)
     */
    private extractTextFromWordParagraph;
    /**
     * Extract text from a Word table (w:tbl element)
     */
    private extractTextFromWordTable;
    /**
     * Extract text from a Word table cell (w:tc element)
     */
    private extractTextFromWordCell;
    /**
     * Extract colors from Word document theme
     * Word documents store theme colors in word/theme/theme1.xml
     */
    protected extractColors(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<string[]>;
}
//# sourceMappingURL=microsoft-word.extractor.d.ts.map