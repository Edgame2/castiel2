/**
 * Microsoft PowerPoint Document Rewriter
 *
 * Rewrites Microsoft PowerPoint presentations by replacing placeholders and inserting charts
 * Uses Microsoft Graph API for OneDrive operations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentRewriter, DocumentAuthToken, DuplicateResult } from './base-rewriter.js';
import { DocumentTemplate } from '../types/template.types.js';
export declare class MicrosoftPowerPointRewriter extends BaseDocumentRewriter {
    private graphApiBaseUrl;
    private config;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Execute API call with automatic retry for rate limits and transient errors
     * Handles rate limiting (429) and service unavailable (503) with exponential backoff
     */
    private executeWithRetry;
    /**
     * Duplicate presentation to user's folder
     */
    duplicateDocument(sourceDocumentId: string, newName: string, destinationFolderId: string, auth: DocumentAuthToken): Promise<DuplicateResult>;
    /**
     * Replace text placeholders in presentation
     *
     * Downloads the .pptx file, unzips it, replaces placeholders in slide XML files,
     * re-zips it, and uploads the modified presentation back to OneDrive.
     */
    replacePlaceholders(documentId: string, _template: DocumentTemplate, generatedValues: Record<string, string>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Replace placeholders in a slide XML file
     * PowerPoint uses a:t (text) elements within a:p (paragraph) elements
     */
    private replacePlaceholdersInSlideXml;
    /**
     * Insert chart images into presentation
     *
     * Downloads the .pptx file, unzips it, inserts chart images into slides,
     * updates relationships, re-zips it, and uploads the modified presentation back to OneDrive.
     */
    insertCharts(documentId: string, template: DocumentTemplate, generatedCharts: Record<string, Buffer>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Insert charts into a slide XML file
     */
    private insertChartsInSlideXml;
    /**
     * Create image picture XML for PowerPoint slide
     */
    private createImagePictureXml;
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
//# sourceMappingURL=microsoft-powerpoint.rewriter.d.ts.map