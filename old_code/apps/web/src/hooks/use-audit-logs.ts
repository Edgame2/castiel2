/**
 * Audit Logs Hook
 * 
 * React Query hook for fetching audit logs with pagination, filtering, and stats
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table'
import {
  auditLogApi,
  type AuditLogEntry,
  type AuditLogStats,
  type AuditLogsResponse,
  type AuditLogFilters,
  type GetAuditLogsParams as UseAuditLogsParams
} from '@/lib/api/audit-logs'

// Re-export types
export type { AuditLogEntry, AuditLogStats, AuditLogsResponse, AuditLogFilters, UseAuditLogsParams }

/**
 * Hook for fetching paginated audit logs
 */
export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const { enabled = true } = params as any; // Cast to access optional enabled prop not in interface

  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogApi.getLogs(params),
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook for fetching audit log statistics
 */
export function useAuditLogStats() {
  return useQuery<AuditLogStats>({
    queryKey: ['audit-logs-stats'],
    queryFn: () => auditLogApi.getStats(),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook for fetching a single audit log entry
 */
export function useAuditLogEntry(logId: string) {
  return useQuery<AuditLogEntry>({
    queryKey: ['audit-log', logId],
    queryFn: () => auditLogApi.getLog(logId),
    enabled: !!logId,
  })
}

/**
 * Hook for exporting audit logs
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: ({
      format,
      filters
    }: {
      format: 'csv' | 'json' | 'xlsx'
      filters?: AuditLogFilters
    }) => auditLogApi.exportLogs(format, filters),
    onSuccess: (blob, { format }) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a' as any)
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T' as any)[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Audit logs exported successfully')
    },
    onError: (error) => {
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    },
  })
}

/**
 * Hook to invalidate audit logs cache
 */
export function useInvalidateAuditLogs() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    queryClient.invalidateQueries({ queryKey: ['audit-logs-stats'] })
  }
}
