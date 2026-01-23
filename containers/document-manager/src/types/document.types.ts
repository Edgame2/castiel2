/**
 * Document Manager types
 * Core data model for document management
 */

export enum StorageProvider {
  AZURE = 'azure',
  AWS = 'aws',
  GCP = 'gcp',
}

export enum VisibilityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
}

export enum DocumentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  PROCESSING = 'processing',
}

export interface DocumentVersionEntry {
  version: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
  changeLog?: string;
  fileSize: number;
  checksum?: string;
}

/**
 * Document structured data (stored in Cosmos DB)
 */
export interface DocumentStructuredData {
  name: string;
  description?: string;
  documentType?: string;
  mimeType: string;
  fileSize: number;
  storageProvider: StorageProvider;
  storagePath: string;
  thumbnailPath?: string;
  previewPath?: string;
  category?: string;
  tags: string[];
  visibility: VisibilityLevel;
  retentionPolicyId?: string;
  retentionUntil?: Date;
  version: number;
  versionHistory: DocumentVersionEntry[];
  scanStatus?: 'pending' | 'clean' | 'infected' | 'error';
  scanTimestamp?: Date;
  extractionStatus?: 'pending' | 'completed' | 'failed';
  extractionTimestamp?: Date;
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedAt: Date;
  deletedBy?: string;
  deletedAt?: Date;
  deletionReason?: string;
}

/**
 * Document unstructured data
 */
export interface DocumentUnstructuredData {
  extractedText?: string;
}

/**
 * Document (stored in Cosmos DB)
 */
export interface Document {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator
  shardId?: string; // Linked shard ID (if linked to Shard Manager)
  structuredData: DocumentStructuredData;
  unstructuredData?: DocumentUnstructuredData;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create document input
 */
export interface CreateDocumentInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  documentType?: string;
  mimeType: string;
  fileSize: number;
  storageProvider: StorageProvider;
  storagePath: string;
  category?: string;
  tags?: string[];
  visibility?: VisibilityLevel;
  shardId?: string;
}

/**
 * Update document input
 */
export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  documentType?: string;
  category?: string;
  tags?: string[];
  visibility?: VisibilityLevel;
  retentionPolicyId?: string;
  retentionUntil?: Date;
}

/**
 * Document Collection
 */
export enum CollectionType {
  FOLDER = 'folder',
  TAG = 'tag',
  SMART = 'smart',
}

export interface DocumentCollection {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator
  name: string;
  description?: string;
  type: CollectionType;
  parentCollectionId?: string; // For nested folders
  documentIds: string[];
  filterCriteria?: {
    tags?: string[];
    category?: string;
    documentType?: string;
    visibility?: VisibilityLevel;
    uploadedBy?: string;
    uploadedAfter?: Date;
    uploadedBefore?: Date;
  }; // For smart collections
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create collection input
 */
export interface CreateCollectionInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: CollectionType;
  parentCollectionId?: string;
  documentIds?: string[];
  filterCriteria?: DocumentCollection['filterCriteria'];
}

/**
 * Update collection input
 */
export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  documentIds?: string[];
  filterCriteria?: DocumentCollection['filterCriteria'];
}

/**
 * Document Template
 */
export interface DocumentTemplate {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator
  name: string;
  description?: string;
  templateType: string;
  content: Record<string, any>; // Template content structure
  variables?: string[]; // Variable placeholders
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create template input
 */
export interface CreateTemplateInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  templateType: string;
  content: Record<string, any>;
  variables?: string[];
}

/**
 * Update template input
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  content?: Record<string, any>;
  variables?: string[];
  isActive?: boolean;
}

/**
 * Upload response
 */
export interface UploadResponse {
  documentId: string;
  storagePath: string;
  uploadUrl?: string; // For direct upload
  expiresAt?: Date;
}

/**
 * Download response
 */
export interface DownloadResponse {
  downloadUrl: string;
  expiresAt: Date;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

