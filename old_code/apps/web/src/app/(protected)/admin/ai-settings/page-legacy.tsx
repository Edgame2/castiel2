'use client'

/**
 * AI Settings Admin Page
 * Super Admin page for managing AI models and system configuration
 */

import { useState } from 'react'
import {
  Sparkles,
  Plus,
  Settings2,
  Cpu,
  BarChart3,
  Check,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useAIModels,
  useSystemAIConfig,
  useUpdateSystemAIConfig,
  useDeleteAIModel,
  useSetDefaultModel,
  useUpdateAIModel,
} from '@/hooks/use-ai-settings'
import type { AIModel } from '@/lib/api/ai-settings'
import { useRouter } from 'next/navigation'

const MODEL_TYPES = [
  { value: 'LLM', label: 'Language Model' },
  { value: 'EMBEDDING', label: 'Embedding' },
  { value: 'IMAGE_GENERATION', label: 'Image Generation' },
  { value: 'TEXT_TO_SPEECH', label: 'Text to Speech' },
  { value: 'SPEECH_TO_TEXT', label: 'Speech to Text' },
  { value: 'MODERATION', label: 'Moderation' },
]

const PROVIDERS = [
  'OpenAI',
  'Azure OpenAI',
  'Anthropic',
  'Google',
  'Cohere',
  'Mistral',
  'Meta',
  'Custom',
]

export default function AISettingsPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>('all')
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)

  const { data: modelsData, isLoading: modelsLoading } = useAIModels(
    selectedType !== 'all' ? { type: selectedType as AIModel['modelType'] } : undefined
  )
  const { data: systemConfig, isLoading: configLoading } = useSystemAIConfig()

  const updateSystemConfig = useUpdateSystemAIConfig()
  const deleteModel = useDeleteAIModel()
  const setDefaultModel = useSetDefaultModel()
  const updateModel = useUpdateAIModel()

  const models = modelsData?.models || []

  // Group models by type for display
  const llmModels = models.filter((m) => m.modelType === 'LLM')
  const embeddingModels = models.filter((m) => m.modelType === 'EMBEDDING')
  const otherModels = models.filter((m) => !['LLM', 'EMBEDDING'].includes(m.modelType))

  const handleDeleteConfirm = async () => {
    if (deleteModelId) {
      await deleteModel.mutateAsync(deleteModelId)
      setDeleteModelId(null)
    }
  }

  const handleToggleActive = async (model: AIModel) => {
    await updateModel.mutateAsync({
      id: model.id,
      data: { isActive: !model.isActive },
    })
  }

  const handleSetDefault = async (model: AIModel) => {
    await setDefaultModel.mutateAsync({ id: model.id, type: model.modelType })
  }

  const handleAddModel = () => {
    router.push('/admin/ai-settings/new')
  }

  const handleEditModel = (model: AIModel) => {
    router.push(`/admin/ai-settings/${model.id}/edit`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Settings</h1>
            <p className="text-muted-foreground">
              Manage AI models and system-wide configuration
            </p>
          </div>
        </div>
        <Button onClick={handleAddModel}>
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models" className="gap-2">
            <Cpu className="h-4 w-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6 mt-6">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MODEL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modelsLoading ? (
            <ModelsLoadingSkeleton />
          ) : models.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No AI models configured</p>
                <p className="text-muted-foreground mb-4">
                  Add AI models to enable AI features across the platform.
                </p>
                <Button onClick={handleAddModel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* LLM Models */}
              {(selectedType === 'all' || selectedType === 'LLM') && llmModels.length > 0 && (
                <ModelSection
                  title="Language Models"
                  description="Models for text generation and chat"
                  models={llmModels}
                  defaultModelId={systemConfig?.defaultLLMModelId}
                  onToggleActive={handleToggleActive}
                  onSetDefault={handleSetDefault}
                  onEdit={handleEditModel}
                  onDelete={setDeleteModelId}
                />
              )}

              {/* Embedding Models */}
              {(selectedType === 'all' || selectedType === 'EMBEDDING') &&
                embeddingModels.length > 0 && (
                  <ModelSection
                    title="Embedding Models"
                    description="Models for generating text embeddings"
                    models={embeddingModels}
                    defaultModelId={systemConfig?.defaultEmbeddingModelId}
                    onToggleActive={handleToggleActive}
                    onSetDefault={handleSetDefault}
                    onEdit={handleEditModel}
                    onDelete={setDeleteModelId}
                  />
                )}

              {/* Other Models */}
              {(selectedType === 'all' ||
                !['LLM', 'EMBEDDING'].includes(selectedType)) &&
                otherModels.length > 0 && (
                  <ModelSection
                    title="Other Models"
                    description="Image, audio, and other AI models"
                    models={otherModels}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEditModel}
                    onDelete={setDeleteModelId}
                  />
                )}
            </>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6 mt-6">
          {configLoading ? (
            <ConfigLoadingSkeleton />
          ) : (
            <>
              {/* Default Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Default Models</CardTitle>
                  <CardDescription>
                    Set the default AI models used across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default Language Model</Label>
                      <Select
                        value={systemConfig?.defaultLLMModelId || ''}
                        onValueChange={(value) =>
                          updateSystemConfig.mutate({ defaultLLMModelId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {llmModels
                            .filter((m) => m.isActive)
                            .map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default Embedding Model</Label>
                      <Select
                        value={systemConfig?.defaultEmbeddingModelId || ''}
                        onValueChange={(value) =>
                          updateSystemConfig.mutate({ defaultEmbeddingModelId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {embeddingModels
                            .filter((m) => m.isActive)
                            .map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rate Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rate Limits</CardTitle>
                  <CardDescription>
                    Configure global rate limits for AI requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Max Tokens Per Request</Label>
                      <Input
                        type="number"
                        value={systemConfig?.maxTokensPerRequest || 4000}
                        onChange={(e) =>
                          updateSystemConfig.mutate({
                            maxTokensPerRequest: parseInt(e.target.value) || 4000,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Requests Per Minute</Label>
                      <Input
                        type="number"
                        value={systemConfig?.maxRequestsPerMinute || 60}
                        onChange={(e) =>
                          updateSystemConfig.mutate({
                            maxRequestsPerMinute: parseInt(e.target.value) || 60,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tenant Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tenant Settings</CardTitle>
                  <CardDescription>
                    Configure how tenants can customize AI settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Tenant Custom Models</Label>
                      <p className="text-sm text-muted-foreground">
                        Let tenants bring their own API keys and custom models
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig?.allowTenantModels ?? true}
                      onCheckedChange={(checked) =>
                        updateSystemConfig.mutate({ allowTenantModels: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Usage Statistics</CardTitle>
              <CardDescription>
                Monitor AI usage across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Usage statistics will appear here once AI features are in use.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Model?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the model from the system. Existing configurations
              using this model may stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Model Section Component
 */
function ModelSection({
  title,
  description,
  models,
  defaultModelId,
  onToggleActive,
  onSetDefault,
  onEdit,
  onDelete,
}: {
  title: string
  description: string
  models: AIModel[]
  defaultModelId?: string
  onToggleActive: (model: AIModel) => void
  onSetDefault?: (model: AIModel) => void
  onEdit: (model: AIModel) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {model.isDeprecated && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Deprecated
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {model.modelId}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <span>{model.provider}</span>
                    {model.hoster !== model.provider && (
                      <p className="text-xs text-muted-foreground">
                        via {model.hoster}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {model.contextWindow ? (
                    <span className="text-sm">
                      {(model.contextWindow / 1000).toFixed(0)}K
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {model.inputPricePerMillion ? (
                    <div className="text-sm">
                      <span>${model.inputPricePerMillion}/M in</span>
                      {model.outputPricePerMillion && (
                        <span className="text-muted-foreground">
                          {' '}
                          / ${model.outputPricePerMillion}/M out
                        </span>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={model.isActive ? 'default' : 'secondary'}
                    className={cn(
                      model.isActive ? 'bg-green-500/10 text-green-600' : ''
                    )}
                  >
                    {model.isActive ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(model)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleActive(model)}>
                        {model.isActive ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      {onSetDefault && !model.isDefault && model.isActive && (
                        <DropdownMenuItem onClick={() => onSetDefault(model)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(model.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ModelsLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConfigLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

