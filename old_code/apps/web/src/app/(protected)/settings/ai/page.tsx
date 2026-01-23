'use client'

/**
 * Tenant AI Settings Page
 * Tenant Admin page for configuring AI defaults and custom credentials
 */

import { useState } from 'react'
import {
  Sparkles,
  Key,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import {
  useTenantAIConfig,
  useUpdateTenantAIConfig,
  useAddCustomCredentials,
  useRemoveCustomCredentials,
  useAvailableModels,
} from '@/hooks/use-ai-settings'

const SUPPORTED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5, DALL-E, Whisper' },
  { id: 'azure', name: 'Azure OpenAI', description: 'Azure-hosted OpenAI models' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models' },
  { id: 'google', name: 'Google AI', description: 'Gemini models' },
  { id: 'cohere', name: 'Cohere', description: 'Command and Embed models' },
  { id: 'mistral', name: 'Mistral AI', description: 'Mistral models' },
]

export default function TenantAISettingsPage() {
  const [addCredentialsOpen, setAddCredentialsOpen] = useState(false)
  const [removeProvider, setRemoveProvider] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const { data: config, isLoading: configLoading } = useTenantAIConfig()
  const { data: availableModels, isLoading: modelsLoading } = useAvailableModels('LLM')
  const { data: embeddingModels } = useAvailableModels('EMBEDDING')

  const updateConfig = useUpdateTenantAIConfig()
  const addCredentials = useAddCustomCredentials()
  const removeCredentials = useRemoveCustomCredentials()

  const handleAddCredentials = async () => {
    if (!selectedProvider || !apiKey) return

    await addCredentials.mutateAsync({
      provider: selectedProvider,
      credentials: {
        apiKey,
        endpoint: endpoint || undefined,
      },
    })

    setAddCredentialsOpen(false)
    setSelectedProvider('')
    setApiKey('')
    setEndpoint('')
  }

  const handleRemoveCredentials = async () => {
    if (!removeProvider) return
    await removeCredentials.mutateAsync(removeProvider)
    setRemoveProvider(null)
  }

  const configuredProviders = config?.customCredentials || []

  if (configLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Settings</h1>
          <p className="text-muted-foreground">
            Configure AI models and credentials for your organization
          </p>
        </div>
      </div>

      {/* Default Models */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Models</CardTitle>
          <CardDescription>
            Choose which AI models to use by default for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Language Model</Label>
              <Select
                value={config?.defaultLLMModelId || ''}
                onValueChange={(value) =>
                  updateConfig.mutate({ defaultLLMModelId: value })
                }
                disabled={modelsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use system default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use system default</SelectItem>
                  {availableModels?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({model.provider})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for chat, insights, and AI-powered features
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default Embedding Model</Label>
              <Select
                value={config?.defaultEmbeddingModelId || ''}
                onValueChange={(value) =>
                  updateConfig.mutate({ defaultEmbeddingModelId: value })
                }
                disabled={modelsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use system default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use system default</SelectItem>
                  {embeddingModels?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({model.provider})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for search, semantic similarity, and RAG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Custom API Keys
            </CardTitle>
            <CardDescription>
              Bring your own API keys to use with supported providers
            </CardDescription>
          </div>
          <Dialog open={addCredentialsOpen} onOpenChange={setAddCredentialsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Credentials</DialogTitle>
                <DialogDescription>
                  Configure your own API key for an AI provider
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_PROVIDERS.filter(
                        (p) => !configuredProviders.some((c) => c.provider === p.id)
                      ).map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div>
                            <span>{provider.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {provider.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
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
                </div>
                {selectedProvider === 'azure' && (
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://your-resource.openai.azure.com/"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddCredentialsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCredentials}
                  disabled={!selectedProvider || !apiKey || addCredentials.isPending}
                >
                  {addCredentials.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Credentials
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {configuredProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No custom API keys configured</p>
              <p className="text-sm">
                Add your own API keys to use models directly with your provider
                account.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {configuredProviders.map((cred) => {
                const provider = SUPPORTED_PROVIDERS.find(
                  (p) => p.id === cred.provider
                )
                return (
                  <div
                    key={cred.provider}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{provider?.name || cred.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {provider?.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-600"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setRemoveProvider(cred.provider)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage & Limits</CardTitle>
          <CardDescription>
            Monitor your AI usage and understand your limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.usageLimit ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Usage</span>
                <span>
                  {config.currentUsage?.toLocaleString() || 0} /{' '}
                  {config.usageLimit.toLocaleString()} tokens
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(
                      ((config.currentUsage || 0) / config.usageLimit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              {(config.currentUsage || 0) > config.usageLimit * 0.8 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Approaching usage limit</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No usage limits configured. Contact your administrator if you need to
              set up usage tracking.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Remove Credentials Confirmation */}
      <AlertDialog
        open={!!removeProvider}
        onOpenChange={() => setRemoveProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove API Credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your custom API key for{' '}
              {SUPPORTED_PROVIDERS.find((p) => p.id === removeProvider)?.name}.
              You'll fall back to using system-provided models.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCredentials}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeCredentials.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}











