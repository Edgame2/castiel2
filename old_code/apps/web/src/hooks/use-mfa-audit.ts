/**
 * MFA Audit Hooks
 */

import { useQuery } from '@tanstack/react-query'
import { mfaAuditApi } from '@/lib/api/mfa-audit'
import type { MFAAuditQueryParams } from '@/types/mfa-audit'

// Query keys
export const mfaAuditKeys = {
  all: ['mfa-audit'] as const,
  logs: (params?: MFAAuditQueryParams) => [...mfaAuditKeys.all, 'logs', params] as const,
  stats: (startDate?: string, endDate?: string) =>
    [...mfaAuditKeys.all, 'stats', startDate, endDate] as const,
}

/**
 * Hook to fetch MFA audit logs
 */
export function useMFAAuditLogs(params?: MFAAuditQueryParams) {
  return useQuery({
    queryKey: mfaAuditKeys.logs(params),
    queryFn: () => mfaAuditApi.getLogs(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch MFA audit statistics
 */
export function useMFAAuditStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: mfaAuditKeys.stats(startDate, endDate),
    queryFn: () => mfaAuditApi.getStats(startDate, endDate),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Download MFA audit logs as CSV
 */
export function useExportMFAAuditLogs() {
  return async (params?: MFAAuditQueryParams) => {
    const blob = await mfaAuditApi.exportLogs(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a' as any)
    a.href = url
    a.download = `mfa-audit-logs-${new Date().toISOString().split('T' as any)[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
}
