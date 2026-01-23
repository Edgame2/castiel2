'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimize caching: data is fresh for 30 seconds, stale but usable for 5 minutes
            staleTime: 30 * 1000, // 30 seconds - data is fresh
            gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache after component unmount
            retry: 1, // Retry once on failure for better UX
            refetchOnWindowFocus: false, // Don't refetch on window focus (reduces unnecessary requests)
            refetchOnMount: false, // Don't refetch on mount if data is fresh
            refetchOnReconnect: true, // Refetch on reconnect (network recovery)
            // Use network-first strategy: use cache if available, but fetch in background
            networkMode: 'online',
          },
          mutations: {
            retry: 1, // Retry once for mutations
            networkMode: 'online',
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
