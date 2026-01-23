/**
 * Base Document Rewriter
 *
 * Abstract base class for format-specific document rewriters
 * All rewriters must implement this interface
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { DocumentTemplate } from '../types/template.types.js';
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
 * Result of duplicating a document
 */
export interface DuplicateResult {
    documentId: string;
    url: string;
}
/**
 * Base rewriter interface
 */
export declare abstract class BaseDocumentRewriter {
    protected monitoring: IMonitoringProvider;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Duplicate document to user's folder
     */
    abstract duplicateDocument(sourceDocumentId: string, newName: string, destinationFolderId: string, auth: DocumentAuthToken): Promise<DuplicateResult>;
    /**
     * Replace text placeholders in document
     */
    abstract replacePlaceholders(documentId: string, template: DocumentTemplate, generatedValues: Record<string, string>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Insert chart images into document
     */
    abstract insertCharts(documentId: string, template: DocumentTemplate, generatedCharts: Record<string, Buffer>, auth: DocumentAuthToken): Promise<void>;
    /**
     * Get document URL
     */
    abstract getDocumentUrl(documentId: string, auth: DocumentAuthToken): Promise<string>;
    /**
     * Get folder path
     */
    abstract getFolderPath(folderId: string, auth: DocumentAuthToken): Promise<string>;
    /**
     * Delete a document (for cleanup on failure)
     */
    abstract deleteDocument(documentId: string, auth: DocumentAuthToken): Promise<void>;
}
//# sourceMappingURL=base-rewriter.d.ts.map