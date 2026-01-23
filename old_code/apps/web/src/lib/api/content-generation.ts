import { apiClient } from './client';

// We need to define the types here if we can't import them directly from API
// Ideally, these should be in a shared package. For now, we'll redefine or import if possible.
// Since @castiel/api is a workspace, we might be able to import types if they are exported.
// But usually web shouldn't import from api src directly.
// Let's define the interfaces here for safety.

export interface ContentTemplate {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    content: string;
    variables: string[];
    type: 'document' | 'presentation';
    isSystem?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTemplateInput {
    name: string;
    description?: string;
    content: string;
    type: 'document' | 'presentation';
}

export interface UpdateTemplateInput {
    name?: string;
    description?: string;
    content?: string;
    type?: 'document' | 'presentation';
}

export interface GenerateContentRequest {
    prompt: string;
    connectionId?: string;
    temperature?: number;
    templateId?: string;
    variables?: Record<string, string>;
    format?: 'html' | 'pdf' | 'docx' | 'pptx';
}

export const contentGenerationApi = {
    // Content Generation
    generate: async (data: GenerateContentRequest): Promise<Blob | { content: string }> => {
        const response = await apiClient.post('/content-generation/generate', data, {
            responseType: data.format && data.format !== 'html' ? 'blob' : 'json',
        });
        return response.data;
    },

    // Templates
    listTemplates: async (): Promise<{ templates: ContentTemplate[] }> => {
        const response = await apiClient.get('/templates' as any);
        return response.data;
    },

    getTemplate: async (id: string): Promise<ContentTemplate> => {
        const response = await apiClient.get(`/templates/${id}`);
        return response.data;
    },

    createTemplate: async (data: CreateTemplateInput): Promise<ContentTemplate> => {
        const response = await apiClient.post('/templates', data);
        return response.data;
    },

    updateTemplate: async (id: string, data: UpdateTemplateInput): Promise<ContentTemplate> => {
        const response = await apiClient.put(`/templates/${id}`, data);
        return response.data;
    },

    deleteTemplate: async (id: string): Promise<void> => {
        await apiClient.delete(`/templates/${id}`);
    },
};
