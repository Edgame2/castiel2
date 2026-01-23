import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as auditApi from '@/lib/api/audit'
import type { AuditLogFilters } from '@/types/api'

// Audit logs list hook
export function useAuditLogs(filters?: AuditLogFilters & { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['audit', 'logs', filters],
    queryFn: () => auditApi.getAuditLogs(filters),
  })
}

// Single audit log hook
export function useAuditLog(logId: string) {
  return useQuery({
    queryKey: ['audit', 'logs', logId],
    queryFn: () => auditApi.getAuditLog(logId),
    enabled: !!logId,
  })
}

// Export audit logs mutation
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (filters?: AuditLogFilters) => auditApi.exportAuditLogs(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a' as any)
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T' as any)[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Audit logs exported successfully')
    },
    onError: () => {
      toast.error('Failed to export audit logs')
    },
  })
}
