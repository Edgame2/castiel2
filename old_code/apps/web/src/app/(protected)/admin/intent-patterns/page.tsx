"use client"

import { useState } from "react"
import { IntentPatternsListWidget } from "@/components/ai-insights/intent-patterns/intent-patterns-list-widget"
import { IntentPatternEditorWidget } from "@/components/ai-insights/intent-patterns/intent-pattern-editor-widget"
import { IntentPatternTestInterface } from "@/components/ai-insights/intent-patterns/intent-pattern-test-interface"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface IntentPattern {
  id: string
  name: string
  description: string
  intentType: string
  subtype?: string
  patterns: string[]
  keywords: string[]
  phrases: string[]
  priority: number
  confidenceWeight: number
  isActive: boolean
  metrics: {
    totalMatches: number
    accuracyRate: number
    avgConfidence: number
    lastMatched?: string
  }
  createdAt: string
  updatedAt: string
}

export default function IntentPatternsAdminPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'test'>('list')
  const [selectedPattern, setSelectedPattern] = useState<IntentPattern | undefined>(undefined)

  const handleEdit = (pattern: IntentPattern) => {
    setSelectedPattern(pattern)
    setView('edit')
  }

  const handleCreate = () => {
    setSelectedPattern(undefined)
    setView('create')
  }

  const handleTest = (pattern: IntentPattern) => {
    setSelectedPattern(pattern)
    setView('test')
  }

  const handleBack = () => {
    setView('list')
    setSelectedPattern(undefined)
  }

  const handleSaved = () => {
    setView('list')
    setSelectedPattern(undefined)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Intent Pattern Management</h1>
          <p className="text-muted-foreground">
            Manage intent classification patterns for AI Insights. Super Admin only.
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
            <CardTitle>Intent Patterns</CardTitle>
            <CardDescription>
              List of all intent classification patterns with performance metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntentPatternsListWidget
              onCreatePattern={handleCreate}
              onEditPattern={handleEdit}
              onTestPattern={handleTest}
            />
          </CardContent>
        </Card>
      )}

      {(view === 'create' || view === 'edit') && (
        <IntentPatternEditorWidget
          pattern={selectedPattern}
          onCancel={handleBack}
          onSaved={handleSaved}
        />
      )}

      {view === 'test' && selectedPattern && (
        <IntentPatternTestInterface
          pattern={selectedPattern}
          onClose={handleBack}
        />
      )}
    </div>
  )
}






