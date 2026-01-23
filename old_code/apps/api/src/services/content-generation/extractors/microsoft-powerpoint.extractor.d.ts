/**
 * Microsoft PowerPoint Document Extractor
 *
 * Extracts placeholders from Microsoft PowerPoint presentations stored in OneDrive
 * Uses Microsoft Graph API to download and parse .pptx files
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import { ExtractionRequest, DocumentParseResult } from '../types/extraction.types.js';
export declare class MicrosoftPowerPointExtractor extends BaseDocumentExtractor {
    private graphApiBaseUrl;
    constructor(monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService);
    /**
     * Get document metadata from Microsoft Graph API
     */
    getDocumentMetadata(documentId: string, auth: DocumentAuthToken): Promise<DocumentMetadata>;
    /**
     * Download presentation from OneDrive
     */
    private downloadPresentation;
    /**
     * Parse PowerPoint presentation and extract text content
     *
     * Parses .pptx files (ZIP archives containing XML files) to extract text and placeholders.
     * Structure:
     * - ppt/presentation.xml: Presentation metadata and slide list
     * - ppt/slides/slide*.xml: Individual slide content
     * - ppt/notesSlides/notesSlide*.xml: Speaker notes
     */
    parseDocument(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<DocumentParseResult>;
    /**
     * Extract text from a slide XML file
     * PowerPoint XML uses a: namespace for drawing elements (a:t for text)
     */
    private extractTextFromSlideXml;
    /**
     * Extract text from a PowerPoint shape (p:sp element)
     */
    private extractTextFromPowerPointShape;
    /**
     * Extract text from a PowerPoint table (p:graphicFrame element)
     */
    private extractTextFromPowerPointTable;
    /**
     * Extract text from a PowerPoint table cell (a:tc element)
     */
    private extractTextFromPowerPointCell;
    /**
     * Extract text from speaker notes XML
     */
    private extractTextFromNotesXml;
    /**
     * Extract colors from PowerPoint theme
     * PowerPoint presentations store theme colors in ppt/theme/theme*.xml
     */
    protected extractColors(documentId: string, auth: DocumentAuthToken, request: ExtractionRequest): Promise<string[]>;
}
//# sourceMappingURL=microsoft-powerpoint.extractor.d.ts.map