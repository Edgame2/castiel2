"use client"

import { useState } from "react"
import { PromptsListWidget } from "@/components/ai-insights/prompts/prompts-list-widget"
import { PromptEditorWidget } from "@/components/ai-insights/prompts/prompt-editor-widget"
import { PromptAnalyticsWidget } from "@/components/ai-insights/prompts/prompt-analytics-widget"
import { Prompt } from "@/types/prompts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PromptsAdminPage() {
    const [view, setView] = useState<'list' | 'create' | 'edit' | 'analytics'>('list')
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined)

    const handleEdit = (prompt: Prompt) => {
        setSelectedPrompt(prompt)
        setView('edit')
    }

    const handleViewAnalytics = (prompt: Prompt) => {
        setSelectedPrompt(prompt)
        setView('analytics')
    }

    const handleCreate = () => {
        setSelectedPrompt(undefined)
        setView('create')
    }

    const handleBack = () => {
        setView('list')
        setSelectedPrompt(undefined)
    }

    const handleSaved = () => {
        setView('list')
        setSelectedPrompt(undefined)
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Prompt Management</h1>
                    <p className="text-muted-foreground">
                        Manage system, tenant, and user prompts for AI Insights.
                    </p>
                </div>
                {view !== 'list' && (
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>
                )}
            </div>

            {view === 'list' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Prompts</CardTitle>
                        <CardDescription>
                            List of all available prompts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PromptsListWidget
                            onCreatePrompt={handleCreate}
                            onEditPrompt={handleEdit}
                            onViewAnalytics={handleViewAnalytics}
                        />
                    </CardContent>
                </Card>
            )}

            {(view === 'create' || view === 'edit') && (
                <PromptEditorWidget
                    prompt={selectedPrompt}
                    onCancel={handleBack}
                    onSaved={handleSaved}
                />
            )}

            {view === 'analytics' && selectedPrompt && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Prompt Analytics</CardTitle>
                                    <CardDescription>
                                        Performance metrics for {selectedPrompt.name}
                                    </CardDescription>
                                </div>
                                <Button variant="outline" onClick={handleBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to List
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                    <PromptAnalyticsWidget 
                        promptId={selectedPrompt.id}
                        promptSlug={selectedPrompt.slug}
                    />
                </div>
            )}
        </div>
    )
}
