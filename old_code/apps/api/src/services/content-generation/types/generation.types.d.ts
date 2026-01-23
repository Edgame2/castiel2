/**
 * Content Generation - Generation Types
 *
 * TypeScript interfaces for document generation jobs and results
 */
import { PlaceholderConfiguration } from './template.types.js';
/**
 * Generation job status
 */
export type GenerationJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
/**
 * Generation request
 */
export interface GenerationRequest {
    templateId: string;
    tenantId: string;
    userId: string;
    destinationFolderId: string;
    destinationProvider: 'google' | 'microsoft';
    context?: {
        projectId?: string;
        variables?: Record<string, string>;
    };
    options?: {
        async?: boolean;
        notifyOnComplete?: boolean;
        skipPlaceholders?: string[];
        requestId?: string;
    };
}
/**
 * Generation job (stored in Service Bus message)
 */
export interface GenerationJob {
    id: string;
    templateId: string;
    tenantId: string;
    userId: string;
    status: GenerationJobStatus;
    destinationFolderId: string;
    destinationProvider: 'google' | 'microsoft';
    context?: {
        projectId?: string;
        variables?: Record<string, string>;
    };
    options?: {
        skipPlaceholders?: string[];
        notifyOnComplete?: boolean;
    };
    requestId?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    retryCount: number;
    maxRetries: number;
    generatedDocumentId?: string;
    generatedDocumentUrl?: string;
    shardId?: string;
    placeholdersFilled?: number;
    resultMetadata?: {
        model?: string;
        tokensUsed?: number;
        duration?: number;
    };
}
/**
 * Generation result
 */
export interface GenerationResult {
    jobId: string;
    templateId: string;
    status: GenerationJobStatus;
    generatedDocumentId?: string;
    generatedDocumentUrl?: string;
    shardId?: string;
    placeholdersFilled: number;
    placeholdersTotal: number;
    errors?: Array<{
        placeholderName: string;
        error: string;
    }>;
    metadata: {
        model?: string;
        tokensUsed?: number;
        duration?: number;
        generatedAt: string;
    };
}
/**
 * Placeholder generation request (for individual placeholder)
 */
export interface PlaceholderGenerationRequest {
    placeholderName: string;
    configuration: PlaceholderConfiguration;
    context?: {
        projectId?: string;
        templateId?: string;
        variables?: Record<string, string>;
        contextTemplate?: any;
    };
    templateColors?: string[];
}
/**
 * Placeholder generation result
 */
export interface PlaceholderGenerationResult {
    placeholderName: string;
    generatedValue: string;
    confidence?: number;
    model?: string;
    tokensUsed?: number;
    duration?: number;
    error?: {
        message: string;
        code?: string;
    };
}
//# sourceMappingURL=generation.types.d.ts.map