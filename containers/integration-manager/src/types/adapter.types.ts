/**
 * Adapter Interface Types
 * Base interface for all integration adapters
 */

/**
 * Base integration adapter interface
 */
export interface IntegrationAdapter {
  // === IDENTITY ===
  readonly providerId: string;
  readonly providerName: string;
  
  // === LIFECYCLE ===
  connect(credentials: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<ConnectionTestResult>;
  
  // === INBOUND (External → Castiel) ===
  fetchRecords?(
    entity: string,
    options: FetchOptions
  ): Promise<FetchResult>;
  
  // === OUTBOUND (Castiel → External) ===
  createRecord?(
    entity: string,
    data: Record<string, any>
  ): Promise<CreateResult>;
  updateRecord?(
    entity: string,
    id: string,
    data: Record<string, any>
  ): Promise<UpdateResult>;
  deleteRecord?(
    entity: string,
    id: string
  ): Promise<DeleteResult>;
  
  // === SEARCH ===
  search(
    options: SearchOptions
  ): Promise<SearchResult>;
  
  // === WEBHOOKS ===
  registerWebhook?(
    events: string[],
    callbackUrl: string
  ): Promise<WebhookRegistration>;
  validateWebhookSignature?(
    payload: any,
    signature: string
  ): boolean;
  
  // === USER PROFILE ===
  /**
   * Get the current authenticated user's profile from the external system
   * Returns the external user ID and optional profile information
   */
  getUserProfile?(): Promise<{
    id: string; // External user ID
    email?: string;
    name?: string;
    [key: string]: any; // Additional profile fields
  }>;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Fetch options
 */
export interface FetchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  userId?: string; // For user-scoped integrations (Castiel user ID)
  externalUserId?: string; // External user ID from the integration system (for filtering API calls)
  tenantId: string;
}

/**
 * Fetch result
 */
export interface FetchResult {
  records: Record<string, any>[];
  total: number;
  hasMore: boolean;
}

/**
 * Create result
 */
export interface CreateResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Update result
 */
export interface UpdateResult {
  success: boolean;
  error?: string;
}

/**
 * Delete result
 */
export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Webhook registration
 */
export interface WebhookRegistration {
  webhookId: string;
  url: string;
  events: string[];
  secret?: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  query?: string;
  entity?: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search result
 */
export interface SearchResult {
  results: Record<string, any>[];
  total: number;
  hasMore: boolean;
}

/**
 * Adapter factory interface
 */
export interface IntegrationAdapterFactory {
  create(
    monitoring: any,
    connectionService: any,
    tenantId: string,
    connectionId: string
  ): IntegrationAdapter;
}
