/**
 * Document Processing Service
 * Extracts text and metadata from documents using Azure OpenAI Vision API
 * Can be extended to use Azure Document Intelligence for more advanced processing
 */
import { IMonitoringProvider } from '@castiel/monitoring';
export interface DocumentProcessingConfig {
    endpoint: string;
    apiKey: string;
    deploymentName?: string;
    apiVersion?: string;
    timeout?: number;
}
export interface DocumentProcessingResult {
    text: string;
    pages?: number;
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string[];
        language?: string;
        pageCount?: number;
    };
    structure?: {
        headings?: Array<{
            level: number;
            text: string;
            page?: number;
        }>;
        paragraphs?: Array<{
            text: string;
            page?: number;
        }>;
        tables?: Array<{
            rows: number;
            columns: number;
            data?: string[][];
            page?: number;
        }>;
    };
    entities?: string[];
    summary?: string;
}
/**
 * Document Processing Service using Azure OpenAI Vision API
 * For PDFs and document images, uses GPT-4 Vision to extract text and structure
 */
export declare class DocumentProcessingService {
    private monitoring;
    private config;
    constructor(config: DocumentProcessingConfig, monitoring: IMonitoringProvider);
    /**
     * Process a document (extract text, structure, metadata)
     */
    processDocument(documentUrl: string): Promise<DocumentProcessingResult>;
    /**
     * Extract text from document using GPT-4 Vision
     */
    private extractTextWithVision;
    /**
     * Get supported document formats
     */
    getSupportedFormats(): string[];
    /**
     * Get maximum file size (in bytes)
     */
    getMaxFileSize(): number;
}
//# sourceMappingURL=document-processing.service.d.ts.map