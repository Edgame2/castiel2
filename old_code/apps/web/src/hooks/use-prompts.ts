import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Prompt, PromptScope } from '@/types/prompts';
import { apiClient } from '@/lib/api/client';

interface UsePromptsOptions {
    scope?: PromptScope;
    insightType?: string;
    search?: string;
    enabled?: boolean;
}

/**
 * Get the endpoint prefix based on scope
 */
function getScopeEndpoint(scope?: PromptScope): string {
    switch (scope) {
        case 'system':
            return '/api/v1/prompts/system';
        case 'tenant':
            return '/api/v1/prompts/tenant';
        case 'user':
            return '/api/v1/prompts/user';
        default:
            return '/api/v1/prompts/user'; // Default to user prompts
    }
}

export function usePrompts(options: UsePromptsOptions = {}) {
    return useQuery({
        queryKey: ['prompts', options],
        queryFn: async () => {
            const endpoint = getScopeEndpoint(options.scope);
            const params = new URLSearchParams();
            if (options.insightType) params.append('insightType', options.insightType);
            if (options.search) params.append('search', options.search);

            const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
            const res = await apiClient.get<Prompt[]>(url);
            return res.data;
        },
        enabled: options.enabled !== false,
    });
}

export function usePrompt(id: string, scope?: PromptScope) {
    return useQuery({
        queryKey: ['prompts', id, scope],
        queryFn: async () => {
            const endpoint = getScopeEndpoint(scope);
            const res = await apiClient.get<Prompt>(`${endpoint}/${id}`);
            return res.data;
        },
        enabled: !!id,
    });
}

export function useCreatePrompt(scope: PromptScope = 'user') {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (prompt: Partial<Prompt>) => {
            const endpoint = getScopeEndpoint(scope);
            const res = await apiClient.post<Prompt>(endpoint, prompt);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}

export function useUpdatePrompt(scope: PromptScope = 'user') {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Prompt> }) => {
            const endpoint = getScopeEndpoint(scope);
            const res = await apiClient.put<Prompt>(`${endpoint}/${id}`, data);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            queryClient.invalidateQueries({ queryKey: ['prompts', data.id] });
        },
    });
}

export function useActivatePrompt(scope: PromptScope = 'user') {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const endpoint = getScopeEndpoint(scope);
            const res = await apiClient.post<Prompt>(`${endpoint}/${id}/activate`, {});
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            queryClient.invalidateQueries({ queryKey: ['prompts', data.id] });
        },
    });
}

export function useArchivePrompt(scope: PromptScope = 'user') {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const endpoint = getScopeEndpoint(scope);
            const res = await apiClient.post<Prompt>(`${endpoint}/${id}/archive`, {});
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            queryClient.invalidateQueries({ queryKey: ['prompts', data.id] });
        },
    });
}

export function usePreviewPrompt() {
    return useMutation({
        mutationFn: async ({ template, variables }: { template: any, variables: any }) => {
            const res = await apiClient.post<{ systemPrompt: string; userPrompt: string }>('/api/v1/prompts/preview', { template, variables });
            return res.data;
        },
    });
}

export function useResolvePrompt() {
    return useMutation({
        mutationFn: async (request: { slug: string; insightType?: string; tags?: string[]; variables?: Record<string, any> }) => {
            const res = await apiClient.post('/api/v1/prompts/resolve', request);
            return res.data;
        },
    });
}

