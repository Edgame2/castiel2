/**
 * Re-export of API client for convenience
 * This allows imports like: import { apiClient } from '@/lib/api-client'
 */

export { apiClient, handleApiError, initializeAuth, clearTokenCache, getCachedToken } from './api/client';
