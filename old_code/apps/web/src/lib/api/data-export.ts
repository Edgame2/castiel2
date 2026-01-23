import { apiClient } from '@/lib/api/client'
import type { DataExport, DataExportRequest, PaginatedResponse } from '@/types/api'

/**
 * Request a new data export
 */
export async function requestDataExport(
  data: DataExportRequest = {}
): Promise<DataExport> {
  const response = await apiClient.post<DataExport>('/data-export', {
    format: data.format || 'json',
    includeShards: data.includeShards ?? true,
    includeAuditLogs: data.includeAuditLogs ?? true,
    includeProfile: data.includeProfile ?? true,
  })
  return response.data
}

/**
 * Get all data exports for the current user
 */
export async function getDataExports(): Promise<DataExport[]> {
  const response = await apiClient.get<PaginatedResponse<DataExport>>('/data-export')
  return response.data.items
}

/**
 * Get a specific data export by ID
 */
export async function getDataExport(id: string): Promise<DataExport> {
  const response = await apiClient.get<DataExport>(`/data-export/${id}`)
  return response.data
}

/**
 * Download a completed data export
 */
export async function downloadDataExport(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/data-export/${id}/download`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Cancel a pending data export
 */
export async function cancelDataExport(id: string): Promise<void> {
  await apiClient.delete(`/data-export/${id}`)
}

/**
 * Request account deletion (GDPR right to be forgotten)
 */
export async function requestAccountDeletion(
  reason?: string
): Promise<{ scheduledFor: string }> {
  const response = await apiClient.post<{ scheduledFor: string }>('/account/delete', {
    reason,
  })
  return response.data
}

/**
 * Cancel a pending account deletion request
 */
export async function cancelAccountDeletion(): Promise<void> {
  await apiClient.delete('/account/delete')
}
