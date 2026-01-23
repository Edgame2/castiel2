/**
 * Connection Form Component
 * Reusable form for creating and editing system-wide AI connections
 * Can be used as both a dedicated page form and as a dashboard widget
 */

import { useForm } from 'react-hook-form'
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useCreateSystemConnection, useUpdateSystemConnection } from '@/hooks/use-ai-settings'
import type { CreateAIConnectionInput, UpdateAIConnectionInput, AIConnection, AIModelCatalog } from '@/lib/api/ai-settings'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type ConnectionFormMode = 'create' | 'edit'
type CredentialType = 'keyVault' | 'envVar'

interface ConnectionFormProps {
    mode: ConnectionFormMode
    connection?: AIConnection
    models: AIModelCatalog[]
    isWidgetMode?: boolean
    onSuccess?: () => void
}

interface FormValues {
    name: string
    modelId: string
    tenantId: string | null
    endpoint: string
    version?: string
    deploymentName?: string
    contextWindow?: number
    isDefaultModel: boolean
    apiKey?: string // Optional to handle both create and update modes
    apiKeyEnvVar?: string
    credentialType?: CredentialType
    keepExistingKey?: boolean
}

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

export function ConnectionForm({
    mode,
    connection,
    models,
    isWidgetMode = false,
    onSuccess,
}: ConnectionFormProps) {
    const router = useRouter()
    const [showApiKey, setShowApiKey] = useState(false)
    const [credentialType, setCredentialType] = useState<CredentialType>('keyVault')
    const [showKeyUpdateDialog, setShowKeyUpdateDialog] = useState(false)
    const [pendingSubmitData, setPendingSubmitData] = useState<FormValues | null>(null)

    const createMutation = useCreateSystemConnection()
    const updateMutation = useUpdateSystemConnection()

    const form = useForm<FormValues>({
        defaultValues:
            mode === 'edit' && connection
                ? {
                    name: connection.name,
                    endpoint: connection.endpoint,
                    version: connection.version || '',
                    deploymentName: connection.deploymentName || '',
                    contextWindow: connection.contextWindow,
                    isDefaultModel: connection.isDefaultModel,
                    credentialType: 'keyVault',
                    keepExistingKey: true,
                    apiKey: '',
                    apiKeyEnvVar: '',
                }
                : {
                    name: '',
                    modelId: '',
                    tenantId: null,
                    endpoint: '',
                    version: '',
                    deploymentName: '',
                    contextWindow: undefined,
                    isDefaultModel: false,
                    apiKey: '',
                    apiKeyEnvVar: '',
                    credentialType: 'keyVault',
                    keepExistingKey: true,
                },
    })

    // Set initial credential type on mount
    useEffect(() => {
        if (mode === 'edit' && connection) {
            const initialType = 'keyVault'
            setCredentialType(initialType)
            form.setValue('credentialType', initialType)
        }
    }, [mode, connection, form])

    const handleCredentialTypeChange = (type: CredentialType) => {
        setCredentialType(type)
        form.setValue('credentialType', type)
        if (type === 'keyVault') {
            form.setValue('apiKeyEnvVar', '')
        } else {
            form.setValue('apiKey', '')
        }
    }

    const validateEndpoint = (endpoint: string): boolean => {
        if (!endpoint) return true // Optional field
        return isValidUrl(endpoint)
    }

    const getModelName = (modelId: string) => {
        const model = models.find((m) => m.id === modelId)
        return model?.name || modelId
    }

    const handleSubmit = async (data: FormValues) => {
        // Validate endpoint URL format
        if (data.endpoint && !validateEndpoint(data.endpoint)) {
            form.setError('endpoint', {
                type: 'manual',
                message: 'Please enter a valid URL (e.g., https://api.openai.com/v1)',
            })
            return
        }

        // For edit mode with Key Vault, check if updating key
        if (mode === 'edit' && credentialType === 'keyVault' && data.apiKey) {
            setPendingSubmitData(data)
            setShowKeyUpdateDialog(true)
            return
        }

        // Proceed with submission
        await submitForm(data)
    }

    const submitForm = async (data: FormValues) => {
        try {
            if (mode === 'create') {
                const submitData = {
                    name: data.name,
                    modelId: data.modelId || '',
                    tenantId: null,
                    endpoint: data.endpoint,
                    version: data.version,
                    deploymentName: data.deploymentName,
                    contextWindow: data.contextWindow,
                    isDefaultModel: data.isDefaultModel,
                    apiKey: credentialType === 'keyVault' ? (data.apiKey || '') : '',
                } as CreateAIConnectionInput
                await createMutation.mutateAsync(submitData)
            } else if (mode === 'edit' && connection) {
                const submitData: UpdateAIConnectionInput = {
                    name: data.name,
                    endpoint: data.endpoint,
                    version: data.version,
                    deploymentName: data.deploymentName,
                    contextWindow: data.contextWindow,
                    isDefaultModel: data.isDefaultModel,
                    // Only include API key if it was changed
                    ...(credentialType === 'keyVault' && data.apiKey ? { apiKey: data.apiKey } : {}),
                }
                await updateMutation.mutateAsync({ id: connection.id, data: submitData })
            }

            form.reset()
            setShowKeyUpdateDialog(false)
            setPendingSubmitData(null)

            if (onSuccess) {
                onSuccess()
            } else if (!isWidgetMode) {
                // Navigate back to connections list if not in widget mode
                router.back()
            }
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace('Failed to submit connection form', 3, {
                errorMessage: errorObj.message,
                mode,
                connectionId: connection?.id,
            })
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Model Selection - Only shown in create mode */}
                    {mode === 'create' && (
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
                    )}

                    {/* Model (Read-only in edit mode) */}
                    {mode === 'edit' && connection && (
                        <div>
                            <FormLabel className="text-muted-foreground">Model</FormLabel>
                            <div className="mt-2 text-sm">{getModelName(connection.modelId)}</div>
                        </div>
                    )}

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
                        rules={{
                            required: 'Endpoint is required',
                            validate: (value) =>
                                !value || validateEndpoint(value) || 'Please enter a valid URL',
                        }}
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
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    id="type-keyvault"
                                    className="h-4 w-4"
                                    checked={credentialType === 'keyVault'}
                                    onChange={() => handleCredentialTypeChange('keyVault')}
                                />
                                <label htmlFor="type-keyvault" className="text-sm font-medium">
                                    Azure Key Vault (Secure Storage)
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    id="type-envvar"
                                    className="h-4 w-4"
                                    checked={credentialType === 'envVar'}
                                    onChange={() => handleCredentialTypeChange('envVar')}
                                />
                                <label htmlFor="type-envvar" className="text-sm font-medium">
                                    Environment Variable
                                </label>
                            </div>
                        </div>

                        {credentialType === 'keyVault' ? (
                            <FormField
                                control={form.control}
                                name="apiKey"
                                rules={{
                                    required:
                                        credentialType === 'keyVault' && mode === 'create'
                                            ? 'API Key is required'
                                            : mode === 'edit'
                                                ? false
                                                : 'API Key is required',
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            API Key {mode === 'create' ? '*' : ''}
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showApiKey ? 'text' : 'password'}
                                                    placeholder={mode === 'edit' ? '(Leave empty to keep existing)' : 'sk-...'}
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
                        ) : (
                            <FormField
                                control={form.control}
                                name="apiKeyEnvVar"
                                rules={{
                                    required: credentialType === 'envVar' ? 'Env Var Name is required' : false,
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Environment Variable Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., OPENAI_API_KEY"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The name of the environment variable on the server containing the key
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
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

                    {/* Form Actions */}
                    <div className="flex gap-3 justify-end">
                        {!isWidgetMode && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {mode === 'create' ? 'Create Connection' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* API Key Update Confirmation Dialog (Edit Mode) */}
            <AlertDialog open={showKeyUpdateDialog} onOpenChange={setShowKeyUpdateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Update API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You're about to replace the existing API key for this connection. This action cannot be undone.

                            <div className="mt-4 space-y-2 text-sm">
                                <p>
                                    <strong>Keep existing:</strong> Keep the current API key in Azure Key Vault
                                </p>
                                <p>
                                    <strong>Update key:</strong> Replace the stored API key with the one you just entered
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Existing</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (pendingSubmitData) {
                                    // Remove the API key before submitting if keeping existing
                                    const dataToSubmit = { ...pendingSubmitData }
                                    if (dataToSubmit.keepExistingKey) {
                                        delete dataToSubmit.apiKey
                                    }
                                    await submitForm(dataToSubmit)
                                }
                            }}
                        >
                            Update Key
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
