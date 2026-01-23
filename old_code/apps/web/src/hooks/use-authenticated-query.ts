import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { isAuthInitialized } from '@/lib/api/client'

/**
 * A wrapper around useQuery that disables queries until auth is initialized
 * This prevents unauthorized requests from being made before the token is loaded
 */
export function useAuthenticatedQuery<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends unknown[] = unknown[],
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'enabled'> & {
    enabled?: boolean
  }
) {
  const { isAuthenticated } = useAuth()
  
  // Disable query until both user is authenticated and auth has been initialized
  const enabled = isAuthenticated && isAuthInitialized() && (options.enabled !== false)

  return useQuery({
    ...options,
    enabled,
  } as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>)
}
