"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Shield, Save, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  useRedactionConfig,
  useUpdateRedactionConfig,
  useDeleteRedactionConfig,
} from "@/hooks/use-redaction"

const redactionFormSchema = z.object({
  fields: z.array(z.string()).min(1, "At least one field is required"),
  redactionValue: z.string().min(1, "Redaction value is required"),
})

type RedactionFormValues = z.infer<typeof redactionFormSchema>

// Common field paths for quick selection
const COMMON_FIELDS = [
  "structuredData.email",
  "structuredData.phone",
  "structuredData.ssn",
  "structuredData.creditCard",
  "structuredData.address",
  "structuredData.dateOfBirth",
  "structuredData.passportNumber",
  "structuredData.driversLicense",
]

export function RedactionConfiguration() {
  const { data: config, isLoading } = useRedactionConfig()
  const updateConfig = useUpdateRedactionConfig()
  const deleteConfig = useDeleteRedactionConfig()
  const [newField, setNewField] = useState("")

  const form = useForm<RedactionFormValues>({
    resolver: zodResolver(redactionFormSchema),
    defaultValues: {
      fields: config?.fields || [],
      redactionValue: config?.redactionValue || "[REDACTED]",
    },
  })

  // Update form when config loads
  useEffect(() => {
    if (config) {
      form.reset({
        fields: config.fields,
        redactionValue: config.redactionValue,
      })
    }
  }, [config, form])

  const onSubmit = async (data: RedactionFormValues) => {
    try {
      await updateConfig.mutateAsync(data)
      toast.success("Redaction configuration updated successfully")
    } catch (error) {
      toast.error("Failed to update redaction configuration")
    }
  }

  const handleDisable = async () => {
    if (!confirm("Are you sure you want to disable redaction? This will remove all redaction policies.")) {
      return
    }

    try {
      await deleteConfig.mutateAsync()
      form.reset({
        fields: [],
        redactionValue: "[REDACTED]",
      })
      toast.success("Redaction disabled successfully")
    } catch (error) {
      toast.error("Failed to disable redaction")
    }
  }

  const addField = () => {
    if (!newField.trim()) return

    const currentFields = form.getValues("fields")
    if (currentFields.includes(newField.trim())) {
      toast.error("Field already added")
      return
    }

    form.setValue("fields", [...currentFields, newField.trim()])
    setNewField("")
  }

  const removeField = (field: string) => {
    const currentFields = form.getValues("fields")
    form.setValue("fields", currentFields.filter((f) => f !== field))
  }

  const addCommonField = (field: string) => {
    const currentFields = form.getValues("fields")
    if (currentFields.includes(field)) {
      toast.error("Field already added")
      return
    }
    form.setValue("fields", [...currentFields, field])
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redaction Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isEnabled = config?.enabled || false
  const fields = form.watch("fields")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PII Redaction Configuration
              </CardTitle>
              <CardDescription>
                Configure which fields should be redacted to protect personally identifiable information (PII)
              </CardDescription>
            </div>
            {isEnabled && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Enabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Redaction is applied automatically when shards are created or updated. Changes take effect immediately.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="redactionValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redaction Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="[REDACTED]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The value to use when redacting fields. Default: [REDACTED]
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Fields to Redact</FormLabel>
                  <span className="text-sm text-muted-foreground">
                    {fields.length} field{fields.length !== 1 ? "s" : ""} configured
                  </span>
                </div>

                {/* Quick add common fields */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Quick Add Common Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_FIELDS.map((field) => (
                      <Button
                        key={field}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCommonField(field)}
                        disabled={fields.includes(field)}
                      >
                        {field}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Custom field input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., structuredData.customField"
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addField()
                      }
                    }}
                  />
                  <Button type="button" onClick={addField} variant="outline">
                    Add Field
                  </Button>
                </div>

                {/* Configured fields list */}
                {fields.length > 0 && (
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field}
                        className="flex items-center justify-between p-3 border rounded-md bg-card"
                      >
                        <code className="text-sm">{field}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No fields configured. Add fields above to enable redaction.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {isEnabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={updateConfig.isPending || deleteConfig.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Disable Redaction
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={updateConfig.isPending || deleteConfig.isPending || fields.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateConfig.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "Never"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated By:</span>
              <span>{config.updatedBy || "System"}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

