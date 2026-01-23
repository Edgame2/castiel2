/**
 * Edit Model Dialog
 * Form for editing models in the catalog
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateModelCatalog } from '@/hooks/use-ai-settings'
import type { AIModelCatalog, UpdateAIModelCatalogInput } from '@/lib/api/ai-settings'

interface EditModelDialogProps {
  model: AIModelCatalog
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditModelDialog({ model, open, onOpenChange }: EditModelDialogProps) {
  const updateMutation = useUpdateModelCatalog()
  
  const form = useForm<UpdateAIModelCatalogInput>({
    defaultValues: {
      name: model.name,
      allowTenantConnections: model.allowTenantConnections,
      contextWindow: model.contextWindow,
      maxOutputs: model.maxOutputs,
      streaming: model.streaming,
      vision: model.vision,
      functions: model.functions,
      jsonMode: model.jsonMode,
      description: model.description,
      modelIdentifier: model.modelIdentifier,
      status: model.status,
    },
  })

  // Reset form when model changes
  useEffect(() => {
    form.reset({
      name: model.name,
      allowTenantConnections: model.allowTenantConnections,
      contextWindow: model.contextWindow,
      maxOutputs: model.maxOutputs,
      streaming: model.streaming,
      vision: model.vision,
      functions: model.functions,
      jsonMode: model.jsonMode,
      description: model.description,
      modelIdentifier: model.modelIdentifier,
      status: model.status,
    })
  }, [model, form])

  const handleSubmit = async (data: UpdateAIModelCatalogInput) => {
    await updateMutation.mutateAsync({ id: model.id, data })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Model: {model.name}</DialogTitle>
          <DialogDescription>
            Update the model's capabilities and settings. Provider, type, and hoster cannot be changed.
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GPT-4 Turbo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FormLabel className="text-muted-foreground">Provider</FormLabel>
                  <div className="mt-2 text-sm">{model.provider}</div>
                </div>
                <div>
                  <FormLabel className="text-muted-foreground">Type</FormLabel>
                  <div className="mt-2 text-sm">{model.type}</div>
                </div>
                <div>
                  <FormLabel className="text-muted-foreground">Hoster</FormLabel>
                  <div className="mt-2 text-sm">{model.hoster}</div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="modelIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., gpt-4-turbo-preview" {...field} />
                    </FormControl>
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Model Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Model Limits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contextWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context Window (tokens)</FormLabel>
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Output Tokens</FormLabel>
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

            {/* Capabilities */}
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
