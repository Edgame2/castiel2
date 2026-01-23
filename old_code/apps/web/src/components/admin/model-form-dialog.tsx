'use client'

/**
 * AI Model Form Dialog
 * Dialog component for creating and editing AI models
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Save } from 'lucide-react'
import { useCreateAIModel, useUpdateAIModel } from '@/hooks/use-ai-settings'
import type { AIModel } from '@/lib/api/ai-settings'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const MODEL_TYPES = [
  { value: 'LLM', label: 'LLM (Large Language Model)', description: 'For text generation and chat' },
  { value: 'EMBEDDING', label: 'Embedding', description: 'For text embeddings and search' },
  { value: 'IMAGE_GENERATION', label: 'Image Generation', description: 'For creating images' },
  { value: 'TEXT_TO_SPEECH', label: 'Text to Speech', description: 'For voice synthesis' },
  { value: 'SPEECH_TO_TEXT', label: 'Speech to Text', description: 'For transcription' },
  { value: 'MODERATION', label: 'Moderation', description: 'For content moderation' },
] as const

const PROVIDERS = [
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Azure OpenAI', label: 'Azure OpenAI' },
  { value: 'Anthropic', label: 'Anthropic' },
  { value: 'Google', label: 'Google' },
  { value: 'Cohere', label: 'Cohere' },
  { value: 'Mistral', label: 'Mistral' },
  { value: 'Meta', label: 'Meta' },
  { value: 'Custom', label: 'Custom' },
] as const

const HOSTERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Microsoft Azure' },
  { value: 'aws', label: 'AWS Bedrock' },
  { value: 'gcp', label: 'Google Cloud' },
  { value: 'self_hosted', label: 'Self-Hosted' },
  { value: 'castiel', label: 'Castiel Infrastructure' },
] as const

// Form validation schema
const modelFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  modelId: z.string().min(1, 'Model ID is required').max(100, 'Model ID is too long'),
  modelType: z.enum(['LLM', 'EMBEDDING', 'IMAGE_GENERATION', 'TEXT_TO_SPEECH', 'SPEECH_TO_TEXT', 'MODERATION']),
  provider: z.string().min(1, 'Provider is required'),
  hoster: z.string().min(1, 'Hoster is required'),
  version: z.string().optional(),
  description: z.string().optional(),
  isSystemWide: z.boolean(),
  isDefault: z.boolean(),
  allowTenantCustom: z.boolean(),
  contextWindow: z.coerce.number().int().positive().optional(),
  maxOutputTokens: z.coerce.number().int().positive().optional(),
  inputPricePerMillion: z.coerce.number().min(0).optional(),
  outputPricePerMillion: z.coerce.number().min(0).optional(),
  supportsStreaming: z.boolean(),
  supportsVision: z.boolean(),
  supportsFunctionCalling: z.boolean(),
  supportsJSON: z.boolean(),
  endpoint: z.string().url().optional().or(z.literal('')),
  deploymentName: z.string().optional(),
  tags: z.string().optional(),
})

type ModelFormValues = z.infer<typeof modelFormSchema>

interface ModelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: AIModel | null
  mode?: 'create' | 'edit'
}

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
  mode = 'create',
}: ModelFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createModel = useCreateAIModel()
  const updateModel = useUpdateAIModel()

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: '',
      modelId: '',
      modelType: 'LLM',
      provider: '',
      hoster: '',
      version: '',
      description: '',
      isSystemWide: true,
      isDefault: false,
      allowTenantCustom: false,
      contextWindow: undefined,
      maxOutputTokens: undefined,
      inputPricePerMillion: undefined,
      outputPricePerMillion: undefined,
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      supportsJSON: false,
      endpoint: '',
      deploymentName: '',
      tags: '',
    },
  })

  // Reset form when model changes or dialog opens
  useEffect(() => {
    if (open && model && mode === 'edit') {
      form.reset({
        name: model.name,
        modelId: model.modelId,
        modelType: model.modelType,
        provider: model.provider,
        hoster: model.hoster,
        version: model.version || '',
        description: model.description || '',
        isSystemWide: model.isSystemWide ?? true,
        isDefault: model.isDefault ?? false,
        allowTenantCustom: model.allowTenantCustom ?? false,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        inputPricePerMillion: model.inputPricePerMillion,
        outputPricePerMillion: model.outputPricePerMillion,
        supportsStreaming: model.supportsStreaming ?? false,
        supportsVision: model.supportsVision ?? false,
        supportsFunctionCalling: model.supportsFunctionCalling ?? false,
        supportsJSON: model.supportsJSON ?? false,
        endpoint: model.endpoint || '',
        deploymentName: model.deploymentName || '',
        tags: model.tags?.join(', ') || '',
      })
    } else if (open && mode === 'create') {
      form.reset({
        name: '',
        modelId: '',
        modelType: 'LLM',
        provider: '',
        hoster: '',
        version: '',
        description: '',
        isSystemWide: true,
        isDefault: false,
        allowTenantCustom: false,
        contextWindow: undefined,
        maxOutputTokens: undefined,
        inputPricePerMillion: undefined,
        outputPricePerMillion: undefined,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        endpoint: '',
        deploymentName: '',
        tags: '',
      })
    }
  }, [open, model, mode, form])

  const onSubmit = async (data: ModelFormValues) => {
    setIsSubmitting(true)
    try {
      // Parse tags
      const tags = data.tags
        ? data.tags.split(',' as any).map((t) => t.trim()).filter(Boolean)
        : []

      // Remove empty optional fields
      const payload: any = {
        name: data.name,
        modelId: data.modelId,
        modelType: data.modelType,
        provider: data.provider,
        hoster: data.hoster,
        isSystemWide: data.isSystemWide,
        isDefault: data.isDefault,
        allowTenantCustom: data.allowTenantCustom,
        supportsStreaming: data.supportsStreaming,
        supportsVision: data.supportsVision,
        supportsFunctionCalling: data.supportsFunctionCalling,
        supportsJSON: data.supportsJSON,
      }

      if (data.version) payload.version = data.version
      if (data.description) payload.description = data.description
      if (data.contextWindow) payload.contextWindow = data.contextWindow
      if (data.maxOutputTokens) payload.maxOutputTokens = data.maxOutputTokens
      if (data.inputPricePerMillion !== undefined) payload.inputPricePerMillion = data.inputPricePerMillion
      if (data.outputPricePerMillion !== undefined) payload.outputPricePerMillion = data.outputPricePerMillion
      if (data.endpoint) payload.endpoint = data.endpoint
      if (data.deploymentName) payload.deploymentName = data.deploymentName
      if (tags.length > 0) payload.tags = tags

      if (mode === 'edit' && model) {
        await updateModel.mutateAsync({ id: model.id, data: payload })
      } else {
        await createModel.mutateAsync(payload)
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to save model', 3, {
        errorMessage: errorObj.message,
        mode: model ? 'edit' : 'create',
        modelId: model?.id,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit AI Model' : 'Add AI Model'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the AI model configuration and settings.'
              : 'Configure a new AI model for use across the platform.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GPT-4o" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., gpt-4o" {...field} />
                      </FormControl>
                      <FormDescription>
                        Technical identifier used in API calls
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the model's capabilities and use cases"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2024-05-13" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., recommended, latest" {...field} />
                      </FormControl>
                      <FormDescription>
                        Comma-separated tags
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Provider & Type */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Provider & Type</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="modelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODEL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoster"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hosted By *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hoster" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HOSTERS.map((hoster) => (
                            <SelectItem key={hoster.value} value={hoster.value}>
                              {hoster.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Capabilities</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contextWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context Window</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 128000"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum tokens in context
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxOutputTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Output Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 4096"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum tokens in response
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="supportsStreaming"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Streaming</FormLabel>
                        <FormDescription>
                          Supports streaming responses
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supportsVision"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Vision</FormLabel>
                        <FormDescription>
                          Can process images
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supportsFunctionCalling"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Function Calling</FormLabel>
                        <FormDescription>
                          Supports tool/function calls
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supportsJSON"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">JSON Mode</FormLabel>
                        <FormDescription>
                          Supports JSON output format
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pricing (USD per million tokens)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="inputPricePerMillion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 5.00"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Cost per million input tokens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outputPricePerMillion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Output Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 15.00"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Cost per million output tokens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Configuration</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://api.example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Custom API endpoint (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deploymentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deployment Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., gpt-4o-deployment" {...field} />
                      </FormControl>
                      <FormDescription>
                        For Azure OpenAI deployments
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Access & Defaults</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isSystemWide"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">System-Wide</FormLabel>
                        <FormDescription>
                          Available to all tenants by default
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Default Model</FormLabel>
                        <FormDescription>
                          Use as default for this model type
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowTenantCustom"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow Tenant API Keys</FormLabel>
                        <FormDescription>
                          Tenants can bring their own API credentials
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : mode === 'edit' ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Model
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
