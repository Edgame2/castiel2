/**
 * Vector Search UI Types
 * 
 * Types for advanced search UI features:
 * - Search history
 * - Saved searches
 * - Autocomplete suggestions
 */

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  tenantId: string;
  query: string;
  filters?: Record<string, any>;
  resultCount?: number;
  searchedAt: Date;
  // Optional metadata
  shardTypeId?: string;
  topK?: number;
  minScore?: number;
}

export interface SavedVectorSearch {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  description?: string;
  query: string;
  filters?: Record<string, any>;
  topK?: number;
  minScore?: number;
  similarityMetric?: string;
  visibility: 'private' | 'team' | 'tenant';
  sharedWith?: string[];
  usageCount: number;
  lastUsedAt?: Date;
  isPinned?: boolean;
  tags?: string[];
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavedVectorSearchInput {
  name: string;
  description?: string;
  query: string;
  filters?: Record<string, any>;
  topK?: number;
  minScore?: number;
  similarityMetric?: string;
  visibility?: 'private' | 'team' | 'tenant';
  sharedWith?: string[];
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateSavedVectorSearchInput {
  name?: string;
  description?: string;
  query?: string;
  filters?: Record<string, any>;
  topK?: number;
  minScore?: number;
  similarityMetric?: string;
  visibility?: 'private' | 'team' | 'tenant';
  sharedWith?: string[];
  tags?: string[];
  icon?: string;
  color?: string;
  isPinned?: boolean;
}

export interface AutocompleteSuggestion {
  query: string;
  type: 'history' | 'popular' | 'suggestion';
  score?: number;
  metadata?: {
    resultCount?: number;
    lastSearched?: Date;
    searchCount?: number;
    searchName?: string;
    [key: string]: any; // Allow additional metadata fields
  };
}

export interface AutocompleteRequest {
  partialQuery: string;
  limit?: number;
  includeHistory?: boolean;
  includePopular?: boolean;
  includeSuggestions?: boolean;
  shardTypeId?: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
  total: number;
}

