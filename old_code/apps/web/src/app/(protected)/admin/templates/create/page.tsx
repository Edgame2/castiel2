'use client';

import TemplateForm from '@/components/content-generation/template-form';

export default function CreateTemplatePage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Create Template</h1>
                <p className="text-muted-foreground">
                    Design a new content template.
                </p>
            </div>
            <TemplateForm mode="create" />
        </div>
    );
}
