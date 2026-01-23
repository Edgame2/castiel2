export interface Slide {
    title: string;
    layout: 'title-bullets' | 'two-column' | 'image-text' | 'title-only' | 'blank';
    content: {
        bullets?: string[];
        text?: string;
        image?: string;
    };
    notes?: string;
}

export interface ContentTemplate {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    content: string; // HTML content or JSON string for slides
    slides?: Slide[]; // Structured data for slides
    variables: string[]; // List of variable names extracted from content
    type: 'document' | 'presentation';
    isSystem?: boolean; // If true, available to all tenants (read-only for tenants)
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
    variableConfig?: Record<string, {
        type: 'text' | 'insight';
        insightTemplateId?: string; // If type is insight
        label?: string;
    }>;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface CreateTemplateInput {
    name: string;
    description?: string;
    content: string;
    type: 'document' | 'presentation';
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
    variableConfig?: Record<string, {
        type: 'text' | 'insight';
        insightTemplateId?: string;
        label?: string;
    }>;
}

export interface UpdateTemplateInput {
    name?: string;
    description?: string;
    content?: string;
    type?: 'document' | 'presentation';
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
    variableConfig?: Record<string, {
        type: 'text' | 'insight';
        insightTemplateId?: string;
        label?: string;
    }>;
}
