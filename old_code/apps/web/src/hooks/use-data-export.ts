import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DataExport, DataExportRequest } from '@/types/api'
import {
  requestDataExport,
  getDataExports,
  getDataExport,
  downloadDataExport,
  cancelDataExport,
  requestAccountDeletion,
  cancelAccountDeletion,
} from '@/lib/api/data-export'

/**
 * Hook to get all data exports
 */
export function useDataExports() {
  return useQuery({
    queryKey: ['data-exports'],
    queryFn: getDataExports,
    refetchInterval: (query) => {
      const data = query.state.data
      // Refetch every 10s if any exports are pending or processing
      if (data?.some((e) => e.status === 'pending' || e.status === 'processing')) {
        return 10000
      }
      return false
    },
  })
}

/**
 * Hook to get a specific data export
 */
export function useDataExport(id: string) {
  return useQuery({
    queryKey: ['data-export', id],
    queryFn: () => getDataExport(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      // Refetch every 5s if pending or processing
      if (status === 'pending' || status === 'processing') {
        return 5000
      }
      return false
    },
  })
}

/**
 * Hook to request a new data export
 */
export function useRequestDataExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DataExportRequest = {}) => requestDataExport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-exports'] })
      toast.success('Export requested', {
        description: 'Your data export has been queued. You will be notified when it is ready.',
      })
    },
    onError: () => {
      toast.error('Failed to request export', {
        description: 'An error occurred while requesting your data export. Please try again.',
      })
    },
  })
}

/**
 * Hook to download a data export
 */
export function useDownloadDataExport() {
  return useMutation({
    mutationFn: async (exportData: DataExport) => {
      const blob = await downloadDataExport(exportData.id)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a' as any)
      link.href = url
      link.download = `castiel-data-export-${exportData.id}.${exportData.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Download started', {
        description: 'Your data export is being downloaded.',
      })
    },
    onError: () => {
      toast.error('Download failed', {
        description: 'An error occurred while downloading your data export. Please try again.',
      })
    },
  })
}

/**
 * Hook to cancel a data export
 */
export function useCancelDataExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cancelDataExport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-exports'] })
      toast.success('Export cancelled', {
        description: 'Your data export request has been cancelled.',
      })
    },
    onError: () => {
      toast.error('Failed to cancel export', {
        description: 'An error occurred while cancelling the export. Please try again.',
      })
    },
  })
}

/**
 * Hook to request account deletion
 */
export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: (reason?: string) => requestAccountDeletion(reason),
    onSuccess: (data) => {
      const date = new Date(data.scheduledFor).toLocaleDateString()
      toast.success('Account deletion scheduled', {
        description: `Your account will be permanently deleted on ${date}. You can cancel this request anytime before then.`,
      })
    },
    onError: () => {
      toast.error('Failed to schedule deletion', {
        description: 'An error occurred while scheduling account deletion. Please try again.',
      })
    },
  })
}

/**
 * Hook to cancel account deletion
 */
export function useCancelAccountDeletion() {
  return useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => {
      toast.success('Deletion cancelled', {
        description: 'Your account deletion request has been cancelled.',
      })
    },
    onError: () => {
      toast.error('Failed to cancel deletion', {
        description: 'An error occurred while cancelling the deletion request. Please try again.',
      })
    },
  })
}
