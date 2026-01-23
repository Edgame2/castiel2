'use client';

import { useQuery } from '@tanstack/react-query';
import { contentGenerationApi } from '@/lib/api/content-generation';
import TemplateForm from '@/components/content-generation/template-form';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function EditTemplatePage() {
    const params = useParams();
    const id = params.id as string;

    const { data: template, isLoading } = useQuery({
        queryKey: ['template', id],
        queryFn: () => contentGenerationApi.getTemplate(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!template) {
        return <div>Template not found</div>;
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
                <p className="text-muted-foreground">
                    Modify existing template.
                </p>
            </div>
            <TemplateForm mode="edit" initialData={template} />
        </div>
    );
}
