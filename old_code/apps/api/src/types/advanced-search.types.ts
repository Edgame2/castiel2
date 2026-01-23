/**
 * Advanced Search Types
 * Complex querying, facets, saved searches, and search analytics
 */

/**
 * Search field types for type-specific handling
 */
export enum SearchFieldType {
  TEXT = 'text',
  KEYWORD = 'keyword',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  GEO = 'geo',
  ARRAY = 'array',
}

/**
 * Search operators
 */
export enum SearchOperator {
  // Text operators
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  EXACT = 'exact',
  FUZZY = 'fuzzy',
  REGEX = 'regex',
  
  // Comparison operators
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_OR_EQUAL = 'lte',
  BETWEEN = 'between',
  
  // Collection operators
  IN = 'in',
  NOT_IN = 'not_in',
  ALL = 'all',
  ANY = 'any',
  NONE = 'none',
  SIZE = 'size',
  
  // Existence operators
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  
  // Date operators
  DATE_BEFORE = 'date_before',
  DATE_AFTER = 'date_after',
  DATE_RANGE = 'date_range',
  DATE_RELATIVE = 'date_relative',
}

/**
 * Relative date options
 */
export type RelativeDate =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_365_days';

/**
 * Search condition
 */
export interface SearchCondition {
  /** Field to search on (supports dot notation for nested fields) */
  field: string;
  /** Operator to apply */
  operator: SearchOperator;
  /** Value(s) to match */
  value: any;
  /** Case sensitivity for text operations */
  caseSensitive?: boolean;
  /** Boost factor for relevance scoring */
  boost?: number;
}

/**
 * Logical group of conditions
 */
export interface SearchConditionGroup {
  /** Logical operator for combining conditions */
  logic: 'AND' | 'OR' | 'NOT';
  /** List of conditions or nested groups */
  conditions: (SearchCondition | SearchConditionGroup)[];
}

/**
 * Facet request for aggregation
 */
export interface FacetRequest {
  /** Field to facet on */
  field: string;
  /** Type of facet */
  type: 'terms' | 'range' | 'date_histogram' | 'stats';
  /** Maximum number of buckets */
  size?: number;
  /** Sort order for buckets */
  sort?: 'count' | 'value' | 'alpha';
  /** Include missing values bucket */
  includeMissing?: boolean;
  /** For range facets: range definitions */
  ranges?: Array<{ from?: number | string; to?: number | string; label?: string }>;
  /** For date histogram: interval */
  interval?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/**
 * Facet result bucket
 */
export interface FacetBucket {
  /** Bucket key/value */
  key: string | number | null;
  /** Document count in bucket */
  count: number;
  /** Optional label for display */
  label?: string;
  /** For range facets: from value */
  from?: number | string;
  /** For range facets: to value */
  to?: number | string;
  /** For stats facets: statistics */
  stats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
}

/**
 * Facet result
 */
export interface FacetResult {
  field: string;
  type: string;
  buckets: FacetBucket[];
  totalBuckets: number;
  otherCount?: number;
  missingCount?: number;
}

/**
 * Sort specification
 */
export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
  /** Handle missing values */
  missing?: 'first' | 'last' | number;
  /** For text fields: sort mode */
  mode?: 'min' | 'max' | 'avg' | 'sum';
}

/**
 * Highlight configuration
 */
export interface HighlightConfig {
  /** Fields to highlight */
  fields: string[];
  /** Pre-tag for highlights */
  preTag?: string;
  /** Post-tag for highlights */
  postTag?: string;
  /** Fragment size */
  fragmentSize?: number;
  /** Number of fragments */
  numberOfFragments?: number;
}

/**
 * Highlight result
 */
export interface HighlightResult {
  field: string;
  fragments: string[];
}

/**
 * Advanced search query
 */
export interface AdvancedSearchQuery {
  /** Tenant ID (required) */
  tenantId: string;
  
  // Basic query
  /** Free text search query */
  query?: string;
  /** Fields to search for free text query */
  queryFields?: string[];
  /** Query type for free text */
  queryType?: 'best_fields' | 'most_fields' | 'cross_fields' | 'phrase';
  
  // Structured filters
  /** Root condition group */
  filters?: SearchConditionGroup;
  
  // Scoping
  /** Filter by shard type IDs */
  shardTypeIds?: string[];
  /** Filter by status */
  statuses?: string[];
  /** Filter by tags (all must match) */
  tags?: string[];
  /** Filter by creator */
  createdBy?: string;
  
  // Date filters
  /** Created after date */
  createdAfter?: Date;
  /** Created before date */
  createdBefore?: Date;
  /** Updated after date */
  updatedAfter?: Date;
  /** Updated before date */
  updatedBefore?: Date;
  
  // Relationship filters
  /** Shards related to this ID */
  relatedTo?: string;
  /** Relationship type for relatedTo filter */
  relationshipType?: string;
  /** Include shards with/without relationships */
  hasRelationships?: boolean;
  
  // Faceting
  /** Facet requests */
  facets?: FacetRequest[];
  
  // Sorting
  /** Sort specifications */
  sort?: SearchSort[];
  
  // Highlighting
  /** Highlight configuration */
  highlight?: HighlightConfig;
  
  // Pagination
  /** Number of results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for efficient pagination */
  cursor?: string;
  
  // Options
  /** Include total count (can be expensive) */
  includeTotal?: boolean;
  /** Track scores */
  trackScores?: boolean;
  /** Explain scoring */
  explain?: boolean;
  /** Minimum score threshold */
  minScore?: number;
  /** Return only IDs (no data) */
  idsOnly?: boolean;
  /** Fields to return (projection) */
  fields?: string[];
  /** Include computed fields */
  includeComputedFields?: boolean;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  /** Shard ID */
  id: string;
  /** Shard type ID */
  shardTypeId: string;
  /** Relevance score */
  score?: number;
  /** Shard data (if not idsOnly) */
  data?: Record<string, any>;
  /** Highlight results */
  highlights?: HighlightResult[];
  /** Score explanation */
  explanation?: string;
}

/**
 * Advanced search result
 */
export interface AdvancedSearchResult {
  /** Search result items */
  items: SearchResultItem[];
  /** Total count (if requested) */
  total?: number;
  /** Maximum score in results */
  maxScore?: number;
  /** Facet results */
  facets?: FacetResult[];
  /** Pagination cursor */
  nextCursor?: string;
  /** Query execution time in ms */
  took: number;
  /** Whether results were truncated */
  truncated?: boolean;
  /** Query that was executed */
  query?: AdvancedSearchQuery;
}

/**
 * Saved search definition
 */
export interface SavedSearch {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  query: AdvancedSearchQuery;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Is this a personal or shared search */
  visibility: 'private' | 'team' | 'tenant';
  /** User IDs who can access (for team visibility) */
  sharedWith?: string[];
  /** Usage count */
  usageCount: number;
  /** Last used date */
  lastUsedAt?: Date;
  /** Is this a default/pinned search */
  isPinned?: boolean;
  /** Tags for organizing */
  tags?: string[];
  /** Icon for display */
  icon?: string;
  /** Color for display */
  color?: string;
}

/**
 * Create saved search input
 */
export interface CreateSavedSearchInput {
  tenantId: string;
  name: string;
  description?: string;
  query: AdvancedSearchQuery;
  createdBy: string;
  visibility?: 'private' | 'team' | 'tenant';
  sharedWith?: string[];
  tags?: string[];
  icon?: string;
  color?: string;
}

/**
 * Update saved search input
 */
export interface UpdateSavedSearchInput {
  name?: string;
  description?: string;
  query?: AdvancedSearchQuery;
  visibility?: 'private' | 'team' | 'tenant';
  sharedWith?: string[];
  isPinned?: boolean;
  tags?: string[];
  icon?: string;
  color?: string;
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  type: 'completion' | 'correction' | 'phrase';
  text: string;
  highlighted?: string;
  score: number;
  frequency?: number;
}

/**
 * Search analytics event
 */
export interface SearchAnalyticsEvent {
  timestamp: Date;
  tenantId: string;
  userId: string;
  query: string;
  filters: number;
  resultCount: number;
  took: number;
  clickedResults?: string[];
  savedSearchId?: string;
}

/**
 * Popular search term
 */
export interface PopularSearchTerm {
  term: string;
  count: number;
  avgResults: number;
  lastSearched: Date;
}

/**
 * Search configuration for a ShardType
 */
export interface ShardTypeSearchConfig {
  /** Fields to include in full-text search */
  searchableFields: Array<{
    field: string;
    type: SearchFieldType;
    boost?: number;
    analyzer?: string;
  }>;
  /** Fields to use for faceting */
  facetFields: string[];
  /** Default sort order */
  defaultSort?: SearchSort[];
  /** Fields to highlight */
  highlightFields?: string[];
  /** Custom search settings */
  settings?: {
    fuzziness?: 'auto' | number;
    prefixLength?: number;
    maxExpansions?: number;
  };
}

/**
 * Search index status
 */
export interface SearchIndexStatus {
  shardTypeId: string;
  indexName: string;
  documentCount: number;
  indexSize: string;
  lastIndexed: Date;
  status: 'green' | 'yellow' | 'red';
  health: {
    replicas: number;
    shards: number;
  };
}

/**
 * Convert relative date to absolute date range
 */
export function resolveRelativeDate(relative: RelativeDate): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (relative) {
    case 'today':
      return { from: today, to: now };
    
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: today };
    }
    
    case 'this_week': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart, to: now };
    }
    
    case 'last_week': {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { from: lastWeekStart, to: lastWeekEnd };
    }
    
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    
    case 'last_month': {
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(lastMonthEnd);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      return { from: lastMonthStart, to: lastMonthEnd };
    }
    
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), quarter * 3, 1), to: now };
    }
    
    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const lastQuarterEnd = new Date(now.getFullYear(), quarter * 3, 1);
      const lastQuarterStart = new Date(lastQuarterEnd);
      lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);
      return { from: lastQuarterStart, to: lastQuarterEnd };
    }
    
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    
    case 'last_year': {
      const lastYearEnd = new Date(now.getFullYear(), 0, 1);
      return { from: new Date(now.getFullYear() - 1, 0, 1), to: lastYearEnd };
    }
    
    case 'last_7_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    
    case 'last_30_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
    
    case 'last_90_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      return { from, to: now };
    }
    
    case 'last_365_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 365);
      return { from, to: now };
    }
    
    default:
      return { from: today, to: now };
  }
}

/**
 * Check if a search condition group is empty
 */
export function isEmptyConditionGroup(group: SearchConditionGroup): boolean {
  return !group.conditions || group.conditions.length === 0;
}

/**
 * Flatten nested condition groups
 */
export function flattenConditions(group: SearchConditionGroup): SearchCondition[] {
  const conditions: SearchCondition[] = [];
  
  for (const item of group.conditions) {
    if ('logic' in item) {
      conditions.push(...flattenConditions(item));
    } else {
      conditions.push(item);
    }
  }
  
  return conditions;
}











