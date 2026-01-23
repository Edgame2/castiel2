'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlobalDocumentSettings, TenantDocumentSettings } from '@/types/documents';
import { apiClient } from '@/lib/api/client';

/**
 * Hook for fetching and managing global document settings (Super Admin)
 */
export function useGlobalSettings() {
    const queryClient = useQueryClient();

    // Fetch global settings
    const {
        data: settings,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['global-settings'],
        queryFn: async () => {
            const { data } = await apiClient.get<GlobalDocumentSettings>('/api/v1/admin/documents/settings/global');
            return data;
        },
    });

    // Update global settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (data: Partial<GlobalDocumentSettings>) => {
            const { data: responseData } = await apiClient.put('/api/v1/admin/documents/settings/global', data);
            return responseData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });

    // Get tenant settings for override
    const getTenantSettingsOverrideMutation = useMutation({
        mutationFn: async (tenantId: string) => {
            const { data } = await apiClient.get<TenantDocumentSettings>(`/api/v1/admin/documents/settings/tenants/${tenantId}`);
            return data;
        },
    });

    // Update tenant settings override mutation
    const updateTenantSettingsOverrideMutation = useMutation({
        mutationFn: async ({ tenantId, data }: { tenantId: string; data: Partial<TenantDocumentSettings> }) => {
            const { data: responseData } = await apiClient.put(`/api/v1/admin/documents/settings/tenants/${tenantId}`, data);
            return responseData;
        },
    });

    return {
        settings,
        isLoading,
        error,
        refetch,
        updateSettings: updateSettingsMutation.mutateAsync,
        isUpdating: updateSettingsMutation.isPending,
        getTenantOverrides: getTenantSettingsOverrideMutation.mutateAsync,
        updateTenantOverrides: updateTenantSettingsOverrideMutation.mutateAsync,
    };
}
