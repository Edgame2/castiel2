'use client'

import { useState, useMemo } from 'react'
import { EmbeddingTemplate, EmbeddingFieldConfig } from '@/lib/api/embedding-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Zap } from 'lucide-react'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TemplateEditorProps {
  template: EmbeddingTemplate
  onChange: (template: EmbeddingTemplate) => void
  shardTypeName?: string
  schemaFields?: string[]
  onGenerateTemplate?: () => Promise<EmbeddingTemplate>
  isGenerating?: boolean
}

export function TemplateEditor({
  template,
  onChange,
  shardTypeName,
  schemaFields = [],
  onGenerateTemplate,
  isGenerating = false,
}: TemplateEditorProps) {
  const [rawJson, setRawJson] = useState(JSON.stringify(template, null, 2))
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [generatedTemplate, setGeneratedTemplate] = useState<EmbeddingTemplate | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)

  // Auto-detect fields from schema
  const availableFields = useMemo(() => {
    const fromSchema = schemaFields || []
    const fromTemplate = template.fields.map((f) => f.name)
    return Array.from(new Set([...fromSchema, ...fromTemplate]))
  }, [schemaFields, template.fields])

  const handleFieldAdd = (fieldName?: string) => {
    const name = fieldName || newFieldName
    if (!name) return

    const newField: EmbeddingFieldConfig = {
      name,
      weight: 100,
      include: true,
    }

    const updated = { ...template, fields: [...template.fields, newField] }
    onChange(updated)
    setRawJson(JSON.stringify(updated, null, 2))
    setNewFieldName('')
    setShowAddField(false)
  }

  const handleFieldRemove = (index: number) => {
    const updated = { ...template, fields: template.fields.filter((_, i) => i !== index) }
    onChange(updated)
    setRawJson(JSON.stringify(updated, null, 2))
  }

  const handleFieldWeightChange = (index: number, weight: number) => {
    const fields = [...template.fields]
    fields[index] = { ...fields[index], weight }
    const updated = { ...template, fields }
    onChange(updated)
    setRawJson(JSON.stringify(updated, null, 2))
  }

  const handlePreprocessingToggle = (index: number, key: keyof NonNullable<EmbeddingFieldConfig['preprocess']>) => {
    const fields = [...template.fields]
    const field = fields[index]
    if (!field.preprocess) {
      field.preprocess = {}
    }
    const currentValue = field.preprocess[key]
    field.preprocess[key] = !currentValue as any
    const updated = { ...template, fields }
    onChange(updated)
    setRawJson(JSON.stringify(updated, null, 2))
  }

  const handleRawJsonChange = (json: string) => {
    setRawJson(json)
    try {
      const parsed = JSON.parse(json)
      onChange(parsed)
    } catch {
      // Invalid JSON, don't update
    }
  }

  const handleGenerateTemplate = async () => {
    if (!onGenerateTemplate) return
    try {
      const generated = await onGenerateTemplate()
      setGeneratedTemplate(generated)
      setShowApprovalModal(true)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to generate template', 3, {
        errorMessage: errorObj.message,
      })
    }
  }

  const handleApproveGenerated = () => {
    if (generatedTemplate) {
      onChange(generatedTemplate)
      setRawJson(JSON.stringify(generatedTemplate, null, 2))
      setShowApprovalModal(false)
      setGeneratedTemplate(null)
    }
  }

  return (
    <>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="preprocessing">Preprocessing</TabsTrigger>
          <TabsTrigger value="model">Model</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Name & Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={template.name}
                  onChange={(e) => onChange({ ...template, name: e.target.value })}
                  placeholder="e.g., Document Embedding Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={template.description || ''}
                  onChange={(e) => onChange({ ...template, description: e.target.value })}
                  placeholder="Describe how this template embeds data..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vector Search & Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Vector Search Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableVectorSearch"
                  checked={template.enableVectorSearch}
                  onCheckedChange={(checked) =>
                    onChange({ ...template, enableVectorSearch: checked as boolean })
                  }
                />
                <Label htmlFor="enableVectorSearch" className="font-normal">
                  Enable Vector Search
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="storeInShard"
                  checked={template.storeInShard}
                  onCheckedChange={(checked) =>
                    onChange({ ...template, storeInShard: checked as boolean })
                  }
                />
                <Label htmlFor="storeInShard" className="font-normal">
                  Store Embeddings in Shard
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Generate from Prompt */}
          {onGenerateTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Generation</CardTitle>
                <CardDescription>Generate template recommendations using AI prompts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateTemplate}
                  disabled={isGenerating}
                  className="w-full"
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Template from Prompt'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fields to Embed</CardTitle>
              <CardDescription>Select and weight fields from your schema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Add from Schema */}
              {availableFields.length > 0 && (
                <div className="space-y-2">
                  <Label>Quick Add from Schema</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableFields.map((field) => {
                      const exists = template.fields.some((f) => f.name === field)
                      return (
                        <Badge
                          key={field}
                          variant={exists ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => !exists && handleFieldAdd(field)}
                        >
                          {exists ? '✓' : '+'} {field}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Current Fields */}
              <div className="space-y-3 mt-6">
                {template.fields.map((field, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{field.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldRemove(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Weight Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Weight</Label>
                        <span className="text-sm font-mono">{field.weight}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.weight]}
                        onValueChange={(val) => handleFieldWeightChange(idx, val[0])}
                        className="w-full"
                      />
                    </div>

                    {/* Include Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`include-${idx}`}
                        checked={field.include}
                        onCheckedChange={(checked) => {
                          const fields = [...template.fields]
                          fields[idx].include = checked as boolean
                          onChange({ ...template, fields })
                        }}
                      />
                      <Label htmlFor={`include-${idx}`} className="font-normal text-sm">
                        Include in embedding
                      </Label>
                    </div>

                    {/* Max Length */}
                    {field.preprocess?.maxLength && (
                      <div className="text-xs text-muted-foreground">
                        Max length: {field.preprocess.maxLength} chars
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Manual Add */}
              {showAddField ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Field name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFieldAdd()
                    }}
                  />
                  <Button onClick={() => handleFieldAdd()} size="sm">
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddField(false)
                      setNewFieldName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowAddField(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Custom Field
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preprocessing Tab */}
        <TabsContent value="preprocessing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Preprocessing</CardTitle>
              <CardDescription>Configure how text is prepared before embedding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="combineFields"
                  checked={template.preprocessing.combineFields}
                  onCheckedChange={(checked) => {
                    const preprocessing = { ...template.preprocessing, combineFields: checked as boolean }
                    onChange({ ...template, preprocessing })
                  }}
                />
                <Label htmlFor="combineFields" className="font-normal">
                  Combine all fields into single text
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Field Separator</Label>
                <Input
                  value={template.preprocessing.fieldSeparator || ' '}
                  onChange={(e) => {
                    const preprocessing = { ...template.preprocessing, fieldSeparator: e.target.value }
                    onChange({ ...template, preprocessing })
                  }}
                  placeholder="e.g., space or newline"
                />
              </div>

              {/* Chunking */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium">Chunking</h4>
                {template.preprocessing.chunking && (
                  <>
                    <div className="space-y-2">
                      <Label>Chunk Size (characters)</Label>
                      <Input
                        type="number"
                        value={template.preprocessing.chunking.chunkSize}
                        onChange={(e) => {
                          const chunking = { ...template.preprocessing.chunking!, chunkSize: parseInt(e.target.value) }
                          onChange({ ...template, preprocessing: { ...template.preprocessing, chunking } })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Overlap (characters)</Label>
                      <Input
                        type="number"
                        value={template.preprocessing.chunking.overlap}
                        onChange={(e) => {
                          const chunking = { ...template.preprocessing.chunking!, overlap: parseInt(e.target.value) }
                          onChange({ ...template, preprocessing: { ...template.preprocessing, chunking } })
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="splitBySentence"
                        checked={template.preprocessing.chunking.splitBySentence}
                        onCheckedChange={(checked) => {
                          const chunking = { ...template.preprocessing.chunking!, splitBySentence: checked as boolean }
                          onChange({ ...template, preprocessing: { ...template.preprocessing, chunking } })
                        }}
                      />
                      <Label htmlFor="splitBySentence" className="font-normal">
                        Split at sentence boundaries
                      </Label>
                    </div>
                  </>
                )}
              </div>

              {/* Normalization */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium">Normalization</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="l2Normalize"
                    checked={template.normalization.l2Normalize}
                    onCheckedChange={(checked) => {
                      const normalization = { ...template.normalization, l2Normalize: checked as boolean }
                      onChange({ ...template, normalization })
                    }}
                  />
                  <Label htmlFor="l2Normalize" className="font-normal">
                    L2 Normalize vectors (for cosine similarity)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Tab */}
        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embedding Model</CardTitle>
              <CardDescription>Select embedding model and strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select
                  value={template.modelConfig.strategy}
                  onValueChange={(strategy) => {
                    const modelConfig = { ...template.modelConfig, strategy: strategy as any }
                    onChange({ ...template, modelConfig })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (balanced)</SelectItem>
                    <SelectItem value="fast">Fast (cost-optimized)</SelectItem>
                    <SelectItem value="quality">Quality (high-accuracy)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {template.modelConfig.strategy === 'custom' && (
                <div className="space-y-2">
                  <Label>Model ID</Label>
                  <Input
                    value={template.modelConfig.modelId || ''}
                    onChange={(e) => {
                      const modelConfig = { ...template.modelConfig, modelId: e.target.value }
                      onChange({ ...template, modelConfig })
                    }}
                    placeholder="e.g., text-embedding-3-large"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Fallback Model ID</Label>
                <Input
                  value={template.modelConfig.fallbackModelId || ''}
                  onChange={(e) => {
                    const modelConfig = { ...template.modelConfig, fallbackModelId: e.target.value }
                    onChange({ ...template, modelConfig })
                  }}
                  placeholder="e.g., text-embedding-ada-002"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent Context */}
          <Card>
            <CardHeader>
              <CardTitle>Parent Context</CardTitle>
              <CardDescription>Include parent shard context (e.g., project name)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.parentContext && (
                <>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select
                      value={template.parentContext.mode}
                      onValueChange={(mode) => {
                        const parentContext = { ...template.parentContext!, mode: mode as any }
                        onChange({ ...template, parentContext })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always include parent</SelectItem>
                        <SelectItem value="whenScoped">When scoped to parent</SelectItem>
                        <SelectItem value="never">Never include</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={template.parentContext.weight ? template.parentContext.weight * 100 : 25}
                      onChange={(e) => {
                        const parentContext = {
                          ...template.parentContext!,
                          weight: parseInt(e.target.value) / 100,
                        }
                        onChange({ ...template, parentContext })
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Length (characters)</Label>
                    <Input
                      type="number"
                      value={template.parentContext.maxLength || 120}
                      onChange={(e) => {
                        const parentContext = { ...template.parentContext!, maxLength: parseInt(e.target.value) }
                        onChange({ ...template, parentContext })
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw JSON Tab */}
        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw JSON Editor</CardTitle>
              <CardDescription>Edit the complete template as JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rawJson}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                className="font-mono text-xs h-96"
                placeholder="Template JSON..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Modal for Generated Template */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Generated Template</DialogTitle>
            <DialogDescription>
              AI has generated a template recommendation. Review and approve or make edits.
            </DialogDescription>
          </DialogHeader>

          {generatedTemplate && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-mono whitespace-pre-wrap">
                  {JSON.stringify(generatedTemplate, null, 2)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveGenerated}>Approve & Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
