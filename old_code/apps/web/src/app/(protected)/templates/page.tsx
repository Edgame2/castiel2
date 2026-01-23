"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TemplateCatalogue } from "@/components/content/template-catalogue"
import { TemplateEditor } from "@/components/content/template-editor"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { trackTrace } from "@/lib/monitoring/app-insights"


export default function TemplatesPage() {
    const router = useRouter()

    const handleCreate = () => {
        router.push("/templates/create")
    }

    const handleEdit = (template: any) => {
        router.push(`/templates/${template.id}/edit`)
    }

    const handleClone = (template: any) => {
        // For clone, we might want to create a copy via API then redirect to edit
        // Or just pass state. For now, let's mock by going to create with params (not implemented)
        // or just log it.
        trackTrace("Clone not fully implemented in UI yet", 1, {
          templateId: template.id,
        })
    }

    return (
        <div className="space-y-6 p-10 pb-16 md:block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Content Templates</h2>
                <p className="text-muted-foreground">
                    Manage templates for document generation.
                </p>
            </div>

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <div className="flex-1 lg:max-w-full">
                    <TemplateCatalogue
                        isAdmin={true}
                        onCreate={handleCreate}
                        onEdit={handleEdit}
                        onClone={handleClone}
                        onSelect={(t) => handleEdit(t)}
                    />
                </div>
            </div>
        </div>
    )
}
