/**
 * API Request and Response Types
 * Standardized DTOs for HTTP requests and responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: Date;
  requestId?: string;
  duration?: number; // milliseconds
  cached?: boolean;
  cacheAge?: number; // seconds
}

/**
 * Pagination request
 */
export interface PaginationRequest {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

/**
 * Sort request
 */
export interface SortRequest {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter request base
 */
export interface FilterRequest {
  [key: string]: any;
}

/**
 * List request with pagination, sorting, filtering
 */
export interface ListRequest<T = FilterRequest> {
  pagination?: PaginationRequest;
  sort?: SortRequest;
  filter?: T;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T> {
  items: T[];
  options?: {
    continueOnError?: boolean;
    returnResults?: boolean;
  };
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T = any> {
  success: boolean;
  successCount: number;
  failureCount: number;
  results?: BulkOperationResult<T>[];
}

/**
 * Individual bulk operation result
 */
export interface BulkOperationResult<T = any> {
  index: number;
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime?: number;
  checks: HealthCheck[];
  timestamp: Date;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

/**
 * Search request
 */
export interface SearchRequest {
  query: string;
  filters?: Record<string, any>;
  pagination?: PaginationRequest;
  sort?: SortRequest;
  options?: SearchOptions;
}

/**
 * Search options
 */
export interface SearchOptions {
  fuzzy?: boolean;
  minScore?: number;
  highlight?: boolean;
  fields?: string[];
}

/**
 * Search response
 */
export interface SearchResponse<T> {
  results: SearchResult<T>[];
  totalCount: number;
  executionTime?: number;
  pagination?: PaginationInfo;
}

/**
 * Search result item
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiError {
  code: 'VALIDATION_ERROR';
  validationErrors: ValidationError[];
}

/**
 * Common HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Common error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_OPERATION = 'INVALID_OPERATION',
}
