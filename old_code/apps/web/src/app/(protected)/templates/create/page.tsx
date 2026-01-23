"use client"

import { useRouter } from "next/navigation"
import { TemplateEditor } from "@/components/content/template-editor"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { trackTrace } from "@/lib/monitoring/app-insights"

export default function CreateTemplatePage() {
    const router = useRouter()

    const handleSave = async (template: any) => {
        // TODO: Call API to create template
        trackTrace("Creating template", 1, {
            templateId: template?.id,
            templateName: template?.name,
        })
        router.push("/templates")
    }

    const handleCancel = () => {
        router.push("/templates")
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            <div className="border-b p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleCancel}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold">Create New Template</h1>
            </div>
            <div className="flex-1 overflow-hidden">
                <TemplateEditor
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    )
}
