/**
 * Content Generation - Generation Types
 * 
 * TypeScript interfaces for document generation jobs and results
 */

import { PlaceholderConfiguration } from './template.types.js';

/**
 * Generation job status
 */
export type GenerationJobStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

/**
 * Generation request
 */
export interface GenerationRequest {
  templateId: string;
  tenantId: string;
  userId: string;
  destinationFolderId: string;     // Google Drive/OneDrive folder ID
  destinationProvider: 'google' | 'microsoft';
  context?: {
    projectId?: string;            // Optional project context
    variables?: Record<string, string>; // Manual overrides
  };
  options?: {
    async?: boolean;                // Process asynchronously (default: true)
    notifyOnComplete?: boolean;     // Send notification when complete
    skipPlaceholders?: string[];    // Placeholder names to skip during generation
    requestId?: string;              // Optional request ID for traceability
  };
}

/**
 * Generation job (stored in Service Bus message)
 */
export interface GenerationJob {
  id: string;                       // Job ID (UUID)
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
    skipPlaceholders?: string[];     // Placeholder names to skip
    notifyOnComplete?: boolean;      // Send notification when complete
  };
  requestId?: string;                // Optional request ID from HTTP request for traceability
  createdAt: string;                // ISO 8601
  startedAt?: string;               // ISO 8601
  completedAt?: string;             // ISO 8601
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  retryCount: number;
  maxRetries: number;
  // Generation results (stored when job completes)
  generatedDocumentId?: string;    // External document ID (Google Drive/OneDrive)
  generatedDocumentUrl?: string;    // Document URL
  shardId?: string;                 // c_document Shard ID (if created)
  placeholdersFilled?: number;      // Number of placeholders successfully filled
  resultMetadata?: {                 // Additional result metadata
    model?: string;                  // AI model used
    tokensUsed?: number;             // Total tokens consumed
    duration?: number;               // Generation time in ms
  };
}

/**
 * Generation result
 */
export interface GenerationResult {
  jobId: string;
  templateId: string;
  status: GenerationJobStatus;
  generatedDocumentId?: string;    // External document ID (Google Drive/OneDrive)
  generatedDocumentUrl?: string;    // Document URL
  shardId?: string;                 // c_document Shard ID (if created)
  placeholdersFilled: number;
  placeholdersTotal: number;
  errors?: Array<{
    placeholderName: string;
    error: string;
  }>;
  metadata: {
    model?: string;                  // AI model used
    tokensUsed?: number;            // Total tokens consumed
    duration?: number;              // Generation time in ms
    generatedAt: string;            // ISO 8601
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
    contextTemplate?: any;          // c_contextTemplate Shard data
  };
  templateColors?: string[];         // Template dominant colors (for charts)
}

/**
 * Placeholder generation result
 */
export interface PlaceholderGenerationResult {
  placeholderName: string;
  generatedValue: string;
  confidence?: number;              // 0-1 confidence score
  model?: string;                   // Model used
  tokensUsed?: number;              // Tokens consumed
  duration?: number;                // Generation time in ms
  error?: {
    message: string;
    code?: string;
  };
}

