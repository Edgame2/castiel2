import apiClient from './client'
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table'

// Types
export interface AuditLogEntry {
    id: string
    tenantId: string
    category: string
    eventType: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    outcome: 'success' | 'failure' | 'partial'
    timestamp: string
    actorId?: string
    actorEmail?: string
    actorType: string
    targetId?: string
    targetType?: string
    targetName?: string
    ipAddress?: string
    userAgent?: string
    message: string
    details?: Record<string, unknown>
    errorMessage?: string
}

export interface AuditLogStats {
    totalEvents: number
    eventsByCategory: Record<string, number>
    eventsBySeverity: Record<string, number>
    eventsByOutcome: Record<string, number>
    topEventTypes: Array<{ type: string; count: number }>
    recentActivity: Array<{ date: string; count: number }>
}

export interface AuditLogsResponse {
    logs: AuditLogEntry[]
    total: number
    limit: number
    offset: number
}

export interface AuditLogFilters {
    category?: string
    severity?: string
    outcome?: string
    search?: string
    startDate?: string
    endDate?: string
    actorEmail?: string
    eventType?: string
}

export interface GetAuditLogsParams {
    page?: number
    pageSize?: number
    filters?: AuditLogFilters
    sorting?: SortingState
    columnFilters?: ColumnFiltersState
}

function columnFiltersToApiFilters(columnFilters: ColumnFiltersState): Partial<AuditLogFilters> {
    const filters: Partial<AuditLogFilters> = {}

    for (const filter of columnFilters) {
        const value = filter.value

        switch (filter.id) {
            case 'category':
                if (Array.isArray(value) && value.length > 0) {
                    filters.category = value.join(',')
                }
                break
            case 'severity':
                if (Array.isArray(value) && value.length > 0) {
                    filters.severity = value.join(',')
                }
                break
            case 'outcome':
                if (Array.isArray(value) && value.length > 0) {
                    filters.outcome = value.join(',')
                }
                break
            case 'actorEmail':
                if (typeof value === 'string') {
                    filters.actorEmail = value
                }
                break
            case 'eventType':
                if (typeof value === 'string') {
                    filters.eventType = value
                }
                break
        }
    }

    return filters
}

export const auditLogApi = {
    getLogs: async (params: GetAuditLogsParams = {}): Promise<AuditLogsResponse> => {
        const { page = 0, pageSize = 20, filters = {}, sorting = [], columnFilters = [] } = params

        // Merge manual filters with column filters
        const columnApiFilters = columnFiltersToApiFilters(columnFilters)
        const mergedFilters = { ...filters, ...columnApiFilters }

        const queryParams: any = {
            limit: pageSize,
            offset: page * pageSize,
            ...mergedFilters
        }

        if (sorting.length > 0) {
            queryParams.sortBy = sorting[0].id
            queryParams.sortOrder = sorting[0].desc ? 'desc' : 'asc'
        }

        const response = await apiClient.get<AuditLogsResponse>('/api/audit-logs', { params: queryParams })
        return response.data
    },

    getStats: async (): Promise<AuditLogStats> => {
        const response = await apiClient.get<AuditLogStats>('/api/audit-logs/stats')
        return response.data
    },

    getLog: async (id: string): Promise<AuditLogEntry> => {
        const response = await apiClient.get<AuditLogEntry>(`/api/audit-logs/${id}`)
        return response.data
    },

    exportLogs: async (format: 'csv' | 'json' | 'xlsx', filters?: AuditLogFilters): Promise<Blob> => {
        const params: any = { format, ...filters }
        const response = await apiClient.get('/api/audit-logs/export', {
            params,
            responseType: 'blob'
        })
        return response.data
    }
}

export default auditLogApi
