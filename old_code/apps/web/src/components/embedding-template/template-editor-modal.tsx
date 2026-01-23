'use client'

import { useState } from 'react'
import { EmbeddingTemplate, buildDefaultEmbeddingTemplate } from '@/lib/api/embedding-templates'
import { apiClient } from '@/lib/api/client'
import { useEmbeddingTemplate, useUpdateEmbeddingTemplate } from '@/hooks/use-embedding-templates'
import { TemplateEditor } from './template-editor'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface TemplateEditorModalProps {
  shardTypeId: string
  shardTypeName: string
  schemaFields?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function TemplateEditorModal({
  shardTypeId,
  shardTypeName,
  schemaFields = [],
  open,
  onOpenChange,
  onSaved,
}: TemplateEditorModalProps) {
  const { data, isLoading } = useEmbeddingTemplate(shardTypeId)
  const { mutateAsync: saveTemplate, isPending: isSaving } = useUpdateEmbeddingTemplate(shardTypeId)
  const [template, setTemplate] = useState<EmbeddingTemplate | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Initialize template on modal open
  if (open && !template && data && !isLoading) {
    const initial = data.template || buildDefaultEmbeddingTemplate({ name: `Template for ${shardTypeName}` })
    setTemplate(initial)
  }

  const handleSave = async () => {
    if (!template) return
    // Normalize weights from 0-100% to 0-1 for backend validation
    const normalizedTemplate = {
      ...template,
      fields: template.fields.map(f => ({
        ...f,
        weight: f.weight > 1 ? f.weight / 100 : f.weight
      }))
    }
    const promise = saveTemplate(normalizedTemplate)
    toast.promise(promise, {
      loading: 'Saving template…',
      success: 'Embedding template saved!',
      error: 'Failed to save template',
    })
    await promise
    onOpenChange(false)
    setTemplate(null)
    onSaved?.()
  }

  const handleGenerateTemplate = async (): Promise<EmbeddingTemplate> => {
    setIsGenerating(true)
    try {
      const promise = apiClient.post<EmbeddingTemplate>(`/api/v1/embedding-templates/generate`, {
        shardTypeId,
        shardTypeName,
        schema: schemaFields,
        promptTag: 'embeddingTemplate',
      })
      toast.promise(promise, {
        loading: 'Generating template from prompt…',
        success: 'Template generated! Review and approve.',
        error: 'Failed to generate template',
      })
      const resp = await promise
      return resp.data
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Embedding Template</DialogTitle>
          <DialogDescription>
            Configure how {shardTypeName} data is vectorized for semantic search
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : template ? (
          <TemplateEditor
            template={template}
            onChange={setTemplate}
            shardTypeName={shardTypeName}
            schemaFields={schemaFields}
            onGenerateTemplate={handleGenerateTemplate}
            isGenerating={isGenerating}
          />
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
