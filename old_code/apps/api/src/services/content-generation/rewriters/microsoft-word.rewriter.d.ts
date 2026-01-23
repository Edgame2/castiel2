/**
 * Microsoft Word Document Rewriter
 *
 * Rewrites Microsoft Word documents by replacing placeholders and inserting charts
 * Uses Microsoft Graph API for OneDrive operations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentRewriter, DocumentAuthToken, DuplicateResult } from './base-rewriter.js';
import { DocumentTemplate } from '../types/template.types.js';
export declare class MicrosoftWordRewriter extends BaseDocumentRewriter {
    private graphApiBaseUrl;
    private config;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Execute API call with automatic retry for rate limits and transient errors
     * Handles rate limiting (429) and service unavailable (503) with exponential backoff
     */
    private executeWithRetry;
    /**
     * Duplicate document to user's folder
     */
    duplicateDocument(sourceDocumentId: string, newName: string, destinationFolderId: string, auth: DocumentAuthToken): Promise<DuplicateResult>;
    /**
     * Replace text placeholders in document
     *
     * Downloads the .docx file, unzips it, replaces placeholders in XML files,
     * re-zips it, and uploads the modified document back to OneDrive.
     */
    replacePlaceholders(documentId: string, _template: DocumentTemplate, generatedValues: Record<string, string>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Replace placeholders in a single XML file within the ZIP
     */
    private replacePlaceholdersInXmlFile;
    /**
     * Insert chart images into document
     *
     * Downloads the .docx file, unzips it, inserts chart images into the document,
     * updates relationships, re-zips it, and uploads the modified document back to OneDrive.
     */
    insertCharts(documentId: string, template: DocumentTemplate, generatedCharts: Record<string, Buffer>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Insert charts into a single XML file within the ZIP
     */
    private insertChartsInXmlFile;
    /**
     * Create image drawing XML for Word document
     */
    private createImageDrawingXml;
    /**
     * Get default relationships XML structure
     */
    private getDefaultRelsXml;
    /**
     * Get next available relationship ID
     */
    private getNextRelationshipId;
    /**
     * Get document URL
     */
    getDocumentUrl(documentId: string, auth: DocumentAuthToken): Promise<string>;
    /**
     * Get folder path
     */
    getFolderPath(folderId: string, auth: DocumentAuthToken): Promise<string>;
    /**
     * Delete a document (for cleanup on failure)
     */
    deleteDocument(documentId: string, auth: DocumentAuthToken): Promise<void>;
}
//# sourceMappingURL=microsoft-word.rewriter.d.ts.map