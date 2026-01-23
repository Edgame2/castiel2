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
    content: string;
    slides?: Slide[];
    variables: string[];
    type: 'document' | 'presentation';
    isSystem?: boolean;
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
    variableConfig?: Record<string, {
        type: 'text' | 'insight';
        insightTemplateId?: string;
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
//# sourceMappingURL=content-template.types.d.ts.map