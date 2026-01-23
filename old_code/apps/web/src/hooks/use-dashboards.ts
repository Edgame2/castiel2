/**
 * Dashboard Hooks
 * React Query hooks for dashboard operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  Dashboard,
  Widget,
  WidgetData,
  MergedDashboard,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  CreateWidgetRequest,
  UpdateWidgetRequest,
  BatchUpdatePositionsRequest,
  WidgetDataRequest,
  DashboardListParams,
  DashboardListResponse,
  DashboardVersion,
  UserDashboardOverrides,
  TenantDashboardConfig,
  FiscalYearConfig,
} from '@/types/dashboard';

// ============================================================================
// Query Keys
// ============================================================================

export const dashboardKeys = {
  all: ['dashboards'] as const,
  lists: () => [...dashboardKeys.all, 'list'] as const,
  list: (params: DashboardListParams) => [...dashboardKeys.lists(), params] as const,
  details: () => [...dashboardKeys.all, 'detail'] as const,
  detail: (id: string) => [...dashboardKeys.details(), id] as const,
  full: (id: string) => [...dashboardKeys.details(), id, 'full'] as const,
  merged: (dashboardId?: string) => [...dashboardKeys.all, 'merged', dashboardId] as const,
  widgets: (dashboardId: string) => [...dashboardKeys.all, 'widgets', dashboardId] as const,
  widget: (widgetId: string) => [...dashboardKeys.all, 'widget', widgetId] as const,
  widgetData: (widgetId: string, request?: WidgetDataRequest) =>
    [...dashboardKeys.all, 'widget-data', widgetId, request] as const,
  versions: (dashboardId: string) => [...dashboardKeys.all, 'versions', dashboardId] as const,
  overrides: (dashboardId: string) => [...dashboardKeys.all, 'overrides', dashboardId] as const,
  config: () => [...dashboardKeys.all, 'config'] as const,
  fiscalYear: () => [...dashboardKeys.all, 'fiscal-year'] as const,
};

// ============================================================================
// Dashboard Queries
// ============================================================================

/**
 * List dashboards
 */
export function useDashboards(params: DashboardListParams = {}, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.dashboardType) searchParams.set('type', params.dashboardType);
      if (params.isTemplate !== undefined) searchParams.set('isTemplate', String(params.isTemplate));
      if (params.isDefault !== undefined) searchParams.set('isDefault', String(params.isDefault));
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

      // Add cache buster
      searchParams.set('_t', Date.now().toString());

      const response = await apiClient.get<DashboardListResponse>(
        `/api/v1/dashboards?${searchParams.toString()}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        }
      );
      return response.data;
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Get single dashboard
 */
export function useDashboard(id: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Dashboard>(`/api/v1/dashboards/${id}`);
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Get dashboard with all widgets
 */
export function useDashboardFull(id: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.full(id),
    queryFn: async () => {
      const response = await apiClient.get<{ dashboard: Dashboard; widgets: Widget[] }>(
        `/api/v1/dashboards/${id}/full`
      );
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000, // 1 minute stale time for full view
  });
}

/**
 * Get merged dashboard for current user
 */
export function useMergedDashboard(dashboardId?: string) {
  return useQuery({
    queryKey: dashboardKeys.merged(dashboardId),
    queryFn: async () => {
      const url = dashboardId
        ? `/api/v1/dashboards/merged?dashboardId=${dashboardId}`
        : '/api/v1/dashboards/merged';
      const response = await apiClient.get<MergedDashboard>(url);
      return response.data;
    },
  });
}

/**
 * Get widgets for a dashboard
 */
export function useWidgets(dashboardId: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.widgets(dashboardId),
    queryFn: async () => {
      const response = await apiClient.get<Widget[]>(`/api/v1/dashboards/${dashboardId}/widgets`);
      return response.data;
    },
    enabled: enabled && !!dashboardId,
  });
}

/**
 * Get single widget
 */
export function useWidget(widgetId: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.widget(widgetId),
    queryFn: async () => {
      const response = await apiClient.get<Widget>(`/api/v1/widgets/${widgetId}`);
      return response.data;
    },
    enabled: enabled && !!widgetId,
  });
}

/**
 * Get widget data
 */
export function useWidgetData(
  widgetId: string,
  request?: WidgetDataRequest,
  options?: { enabled?: boolean; refetchInterval?: number | false; initialData?: WidgetData }
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: dashboardKeys.widgetData(widgetId, request),
    queryFn: async () => {
      const response = await apiClient.post<WidgetData>(`/api/v1/widgets/${widgetId}/data`, request || {});
      return response.data;
    },
    enabled: enabled && !!widgetId,
    initialData: options?.initialData,
    refetchInterval: options?.refetchInterval ?? ((query) => {
      const data = query.state.data;
      // Auto-refresh fallback
      return data?.metadata?.lastRefreshedAt ? 30000 : false;
    }),
  });
}

/**
 * Get dashboard versions
 */
export function useDashboardVersions(dashboardId: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.versions(dashboardId),
    queryFn: async () => {
      const response = await apiClient.get<DashboardVersion[]>(`/api/v1/dashboards/${dashboardId}/versions`);
      return response.data;
    },
    enabled: enabled && !!dashboardId,
  });
}

/**
 * Get user's dashboard overrides
 */
export function useUserOverrides(dashboardId: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.overrides(dashboardId),
    queryFn: async () => {
      const response = await apiClient.get<UserDashboardOverrides>(
        `/api/v1/dashboards/${dashboardId}/overrides`
      );
      return response.data;
    },
    enabled: enabled && !!dashboardId,
  });
}

/**
 * Get tenant dashboard configuration
 */
export function useTenantDashboardConfig(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.config(),
    queryFn: async () => {
      const response = await apiClient.get<TenantDashboardConfig>('/api/v1/dashboards/config');
      return response.data;
    },
    enabled,
  });
}

/**
 * Get fiscal year configuration
 */
export function useFiscalYearConfig() {
  return useQuery({
    queryKey: dashboardKeys.fiscalYear(),
    queryFn: async () => {
      const response = await apiClient.get<FiscalYearConfig>('/api/v1/dashboards/fiscal-year');
      return response.data;
    },
  });
}

// ============================================================================
// Dashboard Mutations
// ============================================================================

/**
 * Create dashboard
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDashboardRequest) => {
      const response = await apiClient.post<Dashboard>('/api/v1/dashboards', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}

/**
 * Update dashboard
 */
export function useUpdateDashboard(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDashboardRequest) => {
      const response = await apiClient.patch<Dashboard>(`/api/v1/dashboards/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.merged() });
    },
  });
}

/**
 * Delete dashboard
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/dashboards/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      queryClient.removeQueries({ queryKey: dashboardKeys.detail(id) });
    },
  });
}

/**
 * Duplicate dashboard
 */
export function useDuplicateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const response = await apiClient.post<Dashboard>(`/api/v1/dashboards/${id}/duplicate`, { newName });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}

/**
 * Set dashboard as default
 */
export function useSetDefaultDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Dashboard>(`/api/v1/dashboards/${id}/set-default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.merged() });
    },
  });
}

/**
 * Rollback dashboard to version
 */
export function useRollbackDashboard(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (version: number) => {
      const response = await apiClient.post<Dashboard>(
        `/api/v1/dashboards/${dashboardId}/rollback`,
        { version }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.versions(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId) });
    },
  });
}

// ============================================================================
// Widget Mutations
// ============================================================================

/**
 * Create widget
 */
export function useCreateWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWidgetRequest) => {
      const response = await apiClient.post<Widget>(`/api/v1/dashboards/${dashboardId}/widgets`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

/**
 * Update widget
 */
export function useUpdateWidget(dashboardId: string, widgetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateWidgetRequest) => {
      const response = await apiClient.patch<Widget>(`/api/v1/widgets/${widgetId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widget(widgetId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgetData(widgetId) });
    },
  });
}

/**
 * Delete widget
 */
export function useDeleteWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      await apiClient.delete(`/api/v1/widgets/${widgetId}`);
      return widgetId;
    },
    onSuccess: (widgetId) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId) });
      queryClient.removeQueries({ queryKey: dashboardKeys.widget(widgetId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

/**
 * Batch update widget positions
 */
export function useBatchUpdatePositions(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BatchUpdatePositionsRequest) => {
      const response = await apiClient.post<Widget[]>(
        `/api/v1/dashboards/${dashboardId}/widgets/positions`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

/**
 * Refresh widget data
 */
export function useRefreshWidgetData(widgetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request?: WidgetDataRequest) => {
      const response = await apiClient.post<WidgetData>(`/api/v1/widgets/${widgetId}/refresh`, request || {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(dashboardKeys.widgetData(widgetId), data);
    },
  });
}

// ============================================================================
// User Override Mutations
// ============================================================================

/**
 * Hide widget
 */
export function useHideWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, sourceDashboardId }: { widgetId: string; sourceDashboardId: string }) => {
      await apiClient.post(`/api/v1/dashboards/${dashboardId}/overrides/hide`, {
        widgetId,
        sourceDashboardId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overrides(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.merged(dashboardId) });
    },
  });
}

/**
 * Show widget (unhide)
 */
export function useShowWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, sourceDashboardId }: { widgetId: string; sourceDashboardId: string }) => {
      await apiClient.post(`/api/v1/dashboards/${dashboardId}/overrides/show`, {
        widgetId,
        sourceDashboardId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overrides(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.merged(dashboardId) });
    },
  });
}

/**
 * Override widget position
 */
export function useOverrideWidgetPosition(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      widgetId,
      sourceDashboardId,
      position
    }: {
      widgetId: string;
      sourceDashboardId: string;
      position: { x: number; y: number }
    }) => {
      await apiClient.post(`/api/v1/dashboards/${dashboardId}/overrides/position`, {
        widgetId,
        sourceDashboardId,
        position,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overrides(dashboardId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.merged(dashboardId) });
    },
  });
}

/**
 * Save filter state
 */
export function useSaveFilterState(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterState: { dateRange?: { preset?: string; startDate?: string; endDate?: string }; customFilters?: Record<string, unknown> }) => {
      await apiClient.post(`/api/v1/dashboards/${dashboardId}/overrides/filters`, filterState);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overrides(dashboardId) });
    },
  });
}

// ============================================================================
// Configuration Mutations
// ============================================================================

/**
 * Update fiscal year configuration
 */
export function useUpdateFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fiscalYearStart: { month: number; day: number }) => {
      const response = await apiClient.post<FiscalYearConfig>('/api/v1/dashboards/fiscal-year', {
        fiscalYearStart,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.fiscalYear() });
    },
  });
}











