/**
 * Create Model Dialog
 * Form for adding AI models to the catalog
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateModelCatalog } from '@/hooks/use-ai-settings'
import type { CreateAIModelCatalogInput } from '@/lib/api/ai-settings'

interface CreateModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PROVIDERS = [
  'OpenAI',
  'Azure OpenAI',
  'Anthropic',
  'Google',
  'AWS Bedrock',
  'Cohere',
  'Mistral',
  'Meta',
  'HuggingFace',
  'Other',
]

const HOSTERS = [
  'OpenAI',
  'Azure',
  'AWS',
  'GCP',
  'Anthropic',
  'Self-Hosted',
  'Other',
]

export function CreateModelDialog({ open, onOpenChange }: CreateModelDialogProps) {
  const createMutation = useCreateModelCatalog()
  
  const form = useForm<CreateAIModelCatalogInput>({
    defaultValues: {
      name: '',
      provider: 'OpenAI',
      type: 'LLM',
      hoster: 'OpenAI',
      allowTenantConnections: false,
      contextWindow: 4096,
      maxOutputs: 2048,
      streaming: false,
      vision: false,
      functions: false,
      jsonMode: false,
      description: '',
      modelIdentifier: '',
    },
  })

  const handleSubmit = async (data: CreateAIModelCatalogInput) => {
    await createMutation.mutateAsync(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Model to Catalog</DialogTitle>
          <DialogDescription>
            Define a new AI model's capabilities. Credentials will be added separately in Connections.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GPT-4 Turbo" {...field} />
                    </FormControl>
                    <FormDescription>
                      Display name for this model
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider"
                  rules={{ required: 'Provider is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDERS.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
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
                  name="type"
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LLM">Language Model (LLM)</SelectItem>
                          <SelectItem value="Embedding">Embedding</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hoster"
                rules={{ required: 'Hoster is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hoster *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select hoster" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOSTERS.map((hoster) => (
                          <SelectItem key={hoster} value={hoster}>
                            {hoster}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Where this model is hosted
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., gpt-4-turbo-preview" {...field} />
                    </FormControl>
                    <FormDescription>
                      API model identifier (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this model..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Capabilities */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Model Limits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contextWindow"
                  rules={{ 
                    required: 'Context window is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context Window (tokens) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="4096"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxOutputs"
                  rules={{ 
                    required: 'Max outputs is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Output Tokens *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2048"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Capabilities Checkboxes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Capabilities</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="streaming"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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
                  name="vision"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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
                  name="functions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Function Calling</FormLabel>
                        <FormDescription>
                          Supports function/tool calls
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
                  name="jsonMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">JSON Mode</FormLabel>
                        <FormDescription>
                          Guaranteed JSON output
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

            {/* Tenant Access */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Access Control</h3>
              
              <FormField
                control={form.control}
                name="allowTenantConnections"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Allow Tenant BYOK (Bring Your Own Key)
                      </FormLabel>
                      <FormDescription>
                        Let tenants create their own connections to this model with custom API keys
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  onOpenChange(false)
                }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Model
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
