/**
 * Create Connection Dialog
 * Form for creating system-wide AI connections with Key Vault integration
 */

import { useForm } from 'react-hook-form'
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateSystemConnection } from '@/hooks/use-ai-settings'
import type { CreateAIConnectionInput, AIModelCatalog } from '@/lib/api/ai-settings'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  models: AIModelCatalog[]
}

export function CreateConnectionDialog({
  open,
  onOpenChange,
  models,
}: CreateConnectionDialogProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const createMutation = useCreateSystemConnection()

  const form = useForm<CreateAIConnectionInput>({
    defaultValues: {
      name: '',
      modelId: '',
      tenantId: null, // System-wide
      endpoint: '',
      version: '',
      deploymentName: '',
      contextWindow: undefined,
      isDefaultModel: false,
      apiKey: '',
    },
  })

  const [credentialType, setCredentialType] = useState<'keyVault' | 'envVar'>('keyVault')

  // Reset the other field when switching types
  const handleCredentialTypeChange = (type: 'keyVault' | 'envVar') => {
    setCredentialType(type)
    if (type === 'envVar') {
      form.setValue('apiKey', '')
    }
  }

  const handleSubmit = async (data: CreateAIConnectionInput) => {
    await createMutation.mutateAsync(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create System Connection</DialogTitle>
          <DialogDescription>
            Configure a system-wide connection with API key stored in Azure Key Vault
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Model Selection */}
            <FormField
              control={form.control}
              name="modelId"
              rules={{ required: 'Model is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Model *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model from catalog" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.provider} - {model.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the model this connection will use
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Connection Name */}
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GPT-4 Production" {...field} />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for this connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endpoint */}
            <FormField
              control={form.control}
              name="endpoint"
              rules={{ required: 'Endpoint is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Endpoint *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credential Type Selection */}
            <div className="space-y-3 rounded-lg border p-4">
              <FormLabel>Credential Storage</FormLabel>
              <FormField
                control={form.control}
                name="apiKey"
                rules={{ required: 'API Key is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-green-600" />
                      Will be securely stored in Azure Key Vault
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024-02-15-preview" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      For Azure OpenAI
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
                      <Input placeholder="e.g., gpt-4-deployment" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      For Azure OpenAI
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contextWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Window Override</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Leave empty to use model default"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Set a lower limit than model default for quota management
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Set as Default */}
            <FormField
              control={form.control}
              name="isDefaultModel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Default</FormLabel>
                    <FormDescription>
                      Make this the default connection for this model type
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

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
                Create Connection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
