"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TemplateEditor } from "@/components/content/template-editor"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { trackTrace } from "@/lib/monitoring/app-insights"

export default function EditTemplatePage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [template, setTemplate] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Mock fetch template
        // TODO: Replace with actual API call
        setTimeout(() => {
            setTemplate({
                id: params.id,
                name: "Example Template",
                description: "Loaded from ID: " + params.id,
                content: "<h1>Example</h1>",
                type: "document",
                variables: []
            })
            setLoading(false)
        }, 500)
    }, [params.id])

    const handleSave = async (updatedTemplate: any) => {
        // TODO: Call API to update template
        trackTrace("Updating template", 1, {
            templateId: updatedTemplate?.id || params.id,
            templateName: updatedTemplate?.name,
        })
        router.push("/templates")
    }

    const handleCancel = () => {
        router.push("/templates")
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            <div className="border-b p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleCancel}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold">Edit Template: {template.name}</h1>
            </div>
            <div className="flex-1 overflow-hidden">
                <TemplateEditor
                    template={template}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    )
}
