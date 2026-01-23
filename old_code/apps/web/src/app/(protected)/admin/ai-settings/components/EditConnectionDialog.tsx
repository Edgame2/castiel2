/**
 * Edit Connection Dialog  
 * Form for editing existing connections (limited fields)
 */

import { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { useUpdateSystemConnection } from '@/hooks/use-ai-settings'
import type { AIConnection, UpdateAIConnectionInput, AIModelCatalog } from '@/lib/api/ai-settings'

interface EditConnectionDialogProps {
  connection: AIConnection
  open: boolean
  onOpenChange: (open: boolean) => void
  models: AIModelCatalog[]
}

export function EditConnectionDialog({
  connection,
  open,
  onOpenChange,
  models,
}: EditConnectionDialogProps) {
  const updateMutation = useUpdateSystemConnection()

  const form = useForm<UpdateAIConnectionInput>({
    defaultValues: {
      name: connection.name,
      endpoint: connection.endpoint,
      version: connection.version,
      deploymentName: connection.deploymentName,
      contextWindow: connection.contextWindow,
      isDefaultModel: connection.isDefaultModel,
    },
  })

  // Reset form when connection changes
  useEffect(() => {
    form.reset({
      name: connection.name,
      endpoint: connection.endpoint,
      version: connection.version,
      deploymentName: connection.deploymentName,
      contextWindow: connection.contextWindow,
      isDefaultModel: connection.isDefaultModel,
    })
  }, [connection, form])

  const getModelName = (modelId: string) => {
    const model = models.find((m) => m.id === modelId)
    return model?.name || modelId
  }

  const handleSubmit = async (data: UpdateAIConnectionInput) => {
    await updateMutation.mutateAsync({ id: connection.id, data })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Connection: {connection.name}</DialogTitle>
          <DialogDescription>
            Update connection settings. To change the API key, delete and recreate the connection.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Model (Read-only) */}
            <div>
              <FormLabel className="text-muted-foreground">Model</FormLabel>
              <div className="mt-2 text-sm">{getModelName(connection.modelId)}</div>
            </div>

            {/* Connection Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GPT-4 Production" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endpoint */}
            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Endpoint</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.openai.com/v1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
