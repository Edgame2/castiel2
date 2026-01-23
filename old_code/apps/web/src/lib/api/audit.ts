import { apiClient } from './client'
import type { AuditLog, AuditLogFilters, PaginatedResponse } from '@/types/api'

// Get audit logs
export async function getAuditLogs(
  filters?: AuditLogFilters & { page?: number; limit?: number }
): Promise<PaginatedResponse<AuditLog>> {
  const response = await apiClient.get('/audit/logs', { params: filters })
  return response.data
}

// Get single audit log
export async function getAuditLog(logId: string): Promise<AuditLog> {
  const response = await apiClient.get(`/audit/logs/${logId}`)
  return response.data
}

// Export audit logs to CSV
export async function exportAuditLogs(filters?: AuditLogFilters): Promise<Blob> {
  const response = await apiClient.get('/audit/logs/export', {
    params: filters,
    responseType: 'blob',
  })
  return response.data
}
