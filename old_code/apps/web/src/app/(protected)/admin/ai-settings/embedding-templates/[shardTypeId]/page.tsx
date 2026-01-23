"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useEmbeddingTemplate, useUpdateEmbeddingTemplate } from '@/hooks/use-embedding-templates'
import { buildDefaultEmbeddingTemplate, EmbeddingTemplate } from '@/lib/api/embedding-templates'
import { TemplateEditor } from '@/components/embedding-template/template-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useShardType } from '@/hooks/use-shard-types'

export default function EmbeddingTemplateDetailPage() {
  const params = useParams() as { shardTypeId?: string }
  const shardTypeId = params?.shardTypeId || ''
  const router = useRouter()

  const { data: templateData, isLoading, isError } = useEmbeddingTemplate(shardTypeId)
  const { data: shardTypeData } = useShardType(shardTypeId)
  const { mutateAsync: saveTemplate, isPending } = useUpdateEmbeddingTemplate(shardTypeId)

  const [template, setTemplate] = useState<EmbeddingTemplate | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Initialize template when data loads
  useEffect(() => {
    if (templateData && !template) {
      const initial = templateData.template || buildDefaultEmbeddingTemplate({ 
        name: `Template for ${shardTypeData?.name || shardTypeId}` 
      })
      setTemplate(initial)
    }
  }, [templateData, shardTypeData, shardTypeId, template])

  async function handleSave() {
    if (!template) return
    
    try {
      // Normalize weights from 0-100% to 0-1 for backend validation
      const normalizedTemplate = {
        ...template,
        fields: template.fields.map(f => ({
          ...f,
          weight: f.weight > 1 ? f.weight / 100 : f.weight
        }))
      }
      
      await saveTemplate(normalizedTemplate)
      toast.success('Embedding template saved successfully')
      router.push('/admin/ai-settings/embedding-templates')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save template')
    }
  }

  async function handleGenerateTemplate(): Promise<EmbeddingTemplate> {
    setIsGenerating(true)
    try {
      const { embeddingTemplatesApi } = await import('@/lib/api/embedding-templates' as any)
      const { apiClient } = await import('@/lib/api/client' as any)
      
      const response = await (apiClient as any).post(`/api/v1/embedding-templates/generate`, {
        shardTypeId,
        shardTypeName: shardTypeData?.name || shardTypeId,
        schema: [], // Could extract from shardTypeData if available
        promptTag: 'embeddingTemplate',
      })
      
      toast.success('Template generated! Review and approve.')
      return (response.data || response) as EmbeddingTemplate
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate template')
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError || !template) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="text-sm text-red-600">Failed to load template.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Embedding Template</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              const defaultTemplate = buildDefaultEmbeddingTemplate({ 
                name: `Template for ${shardTypeData?.name || shardTypeId}` 
              })
              setTemplate(defaultTemplate)
            }}
          >
            <Wand2 className="h-4 w-4 mr-1" /> Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4 mr-1" /> {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shard Type: {shardTypeData?.name || shardTypeId}</CardTitle>
          <CardDescription>
            {templateData?.isDefault 
              ? 'Using system default. Edit to create a custom template.' 
              : 'Custom template is active.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            template={template}
            onChange={setTemplate}
            shardTypeName={shardTypeData?.name || shardTypeId}
            schemaFields={[]} // Could extract from shardTypeData if available
            onGenerateTemplate={handleGenerateTemplate}
            isGenerating={isGenerating}
          />
        </CardContent>
      </Card>
    </div>
  )
}
