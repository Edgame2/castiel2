/**
 * Document Management Types
 * Core type definitions for document management system
 */

export type DocumentVisibility = 'public' | 'internal' | 'confidential';
export type DocumentStatus = 'active' | 'deleted' | 'quarantined' | 'scan_failed';
export type CollectionType = 'folder' | 'tag' | 'smart';

export interface Document {
  id: string;
  name: string;
  description?: string;
  shardTypeId?: string; // Added to support linking
  shardTypeName?: string; // Added to support linking
  documentType?: string;
  mimeType: string;
  fileSize: number;
  category?: string;
  tags: string[];
  visibility: DocumentVisibility;
  storagePath: string;
  blobUrl?: string;
  previewPath?: string;
  thumbnailPath?: string;
  status: DocumentStatus;
  version: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
  collectionIds?: string[];
  retentionPolicyId?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  collectionType: CollectionType;
  documentIds: string[];
  query?: CollectionQuery;
  visibility: DocumentVisibility;
  parentCollectionId?: string;
  children?: Collection[];
  documentCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CollectionQuery {
  filters: DocumentFilters;
}

export interface DocumentFilters {
  search?: string;
  searchQuery?: string;
  category?: string;
  tags?: string[];
  visibility?: DocumentVisibility | DocumentVisibility[];
  status?: DocumentStatus[];
  fileType?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  speed?: number; // bytes per second
  estimatedTime?: number; // seconds remaining
  startTime: number;
}

export interface DocumentMetadata {
  category?: string;
  tags: string[];
  visibility: DocumentVisibility;
  description?: string;
  projectId?: string;
}

export interface TenantDocumentSettings {
  maxFileSizeBytes: number;
  dailyUploadLimit: number; // Added
  monthlyUploadLimit: number; // Added
  maxStorageSizeBytes: number;
  currentStorageUsed: number;
  acceptedMimeTypes: string[];
  blockedMimeTypes?: string[];
  categories: Category[];
  allowCustomCategories: boolean;
  controlledTags?: string[];
  defaultVisibility: DocumentVisibility;
  allowPublicDocuments: boolean;
  defaultRetentionDays: number;
  // Flattened features to match backend if needed, or keep as object if mapping exists.
  // Backend has: enableVirusScanning, enablePIIRedaction, etc. at top level for TenantDocumentSettings?
  // Checking backend type: It has them at top level.
  enableVirusScanning: boolean;
  enablePIIRedaction: boolean;
  enableTextExtraction: boolean;
  enablePreviewGeneration: boolean;
}

export interface GlobalDocumentSettings {
  id: string;
  configType: string;
  globalMaxFileSizeBytes: number; // Hard limit
  globalMaxStorageSizeBytes: number;
  defaultTenantMaxFileSizeBytes: number;
  defaultTenantMaxStorageBytes: number;
  defaultDailyUploadLimit: number;
  defaultMonthlyUploadLimit: number;
  systemAcceptedMimeTypes: string[];
  systemBlockedMimeTypes: string[];
  defaultCategories: Category[];
  enableDocumentManagement: boolean;
  enableBulkOperations: boolean;
  enableCollections: boolean;
  defaultRetentionDays: number;
  hardDeleteAfterDays: number;
  updatedAt: string | Date;
  updatedBy: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  retentionDays?: number;
  isActive: boolean;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  documentCount: number;
  collectionCount: number;
}
