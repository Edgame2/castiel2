/**
 * Google Docs Document Rewriter
 *
 * Rewrites Google Docs documents by replacing placeholders and inserting charts
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentRewriter, DocumentAuthToken, DuplicateResult } from './base-rewriter.js';
import { DocumentTemplate } from '../types/template.types.js';
export declare class GoogleDocsRewriter extends BaseDocumentRewriter {
    private docsClient;
    private driveClient;
    private oauth2Client;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize Google API clients
     */
    private initializeClients;
    /**
     * Execute API call with automatic token refresh on 401 errors and rate limit handling
     * Google's OAuth2Client should handle token refresh automatically, but we add explicit handling
     * Also handles rate limits (429) with exponential backoff
     */
    private executeWithTokenRefresh;
    /**
     * Duplicate document to user's folder
     */
    duplicateDocument(sourceDocumentId: string, newName: string, destinationFolderId: string, auth: DocumentAuthToken): Promise<DuplicateResult>;
    /**
     * Replace text placeholders in document
     */
    replacePlaceholders(documentId: string, template: DocumentTemplate, generatedValues: Record<string, string>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Insert chart images into document
     */
    insertCharts(documentId: string, template: DocumentTemplate, generatedCharts: Record<string, Buffer>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Upload chart image to Google Drive
     */
    private uploadChartImageToDrive;
    /**
     * Make image publicly accessible
     */
    private makeImagePublic;
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
//# sourceMappingURL=google-docs.rewriter.d.ts.map