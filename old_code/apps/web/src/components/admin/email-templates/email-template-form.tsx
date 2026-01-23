"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCreateEmailTemplate, useUpdateEmailTemplate } from "@/hooks/use-email-templates"
import type { EmailTemplate, CreateEmailTemplateInput, UpdateEmailTemplateInput } from "@/types/email-template"
import { Plus, X } from "lucide-react"
import { useState } from "react"
import { PlaceholderHelper } from "./placeholder-helper"
import { EmailTemplatePreview } from "./email-template-preview"
import { TipTapEditorWithPlaceholders } from "@/components/editor"

const templateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Name must contain only lowercase letters, numbers, and hyphens"),
  language: z.string().length(2).regex(/^[a-z]{2}$/, "Language must be a 2-letter code"),
  displayName: z.string().min(1).max(200),
  category: z.enum(["notifications", "invitations", "alerts", "system"]),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().min(1),
  fromEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().max(200).optional().or(z.literal("")),
  replyTo: z.string().email().optional().or(z.literal("")),
  placeholders: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    example: z.string(),
    required: z.boolean(),
  })),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface EmailTemplateFormProps {
  template?: EmailTemplate
  onSuccess?: () => void
}

export function EmailTemplateForm({ template, onSuccess }: EmailTemplateFormProps) {
  const [placeholderInput, setPlaceholderInput] = useState("")
  const createTemplate = useCreateEmailTemplate()
  const updateTemplate = useUpdateEmailTemplate()

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? {
      name: template.name,
      language: template.language,
      displayName: template.displayName,
      category: template.category,
      description: template.description || "",
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      fromEmail: template.fromEmail || "",
      fromName: template.fromName || "",
      replyTo: template.replyTo || "",
      placeholders: template.placeholders || [],
    } : {
      name: "",
      language: "en",
      displayName: "",
      category: "notifications",
      description: "",
      subject: "",
      htmlBody: "",
      textBody: "",
      fromEmail: "",
      fromName: "",
      replyTo: "",
      placeholders: [],
    },
  })

  const placeholders = form.watch("placeholders")

  const addPlaceholder = () => {
    if (placeholderInput && !placeholders.find(p => p.name === placeholderInput)) {
      form.setValue("placeholders", [
        ...placeholders,
        {
          name: placeholderInput,
          description: "",
          example: "",
          required: false,
        },
      ])
      setPlaceholderInput("")
    }
  }

  const removePlaceholder = (index: number) => {
    form.setValue("placeholders", placeholders.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: TemplateFormData) => {
    try {
      if (template) {
        const updateData: UpdateEmailTemplateInput = {
          displayName: data.displayName,
          category: data.category,
          description: data.description || undefined,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
          fromEmail: data.fromEmail || undefined,
          fromName: data.fromName || undefined,
          replyTo: data.replyTo || undefined,
          placeholders: data.placeholders,
        }
        await updateTemplate.mutateAsync({
          id: template.id,
          data: updateData,
        })
      } else {
        const createData: CreateEmailTemplateInput = {
          name: data.name,
          language: data.language,
          displayName: data.displayName,
          category: data.category,
          description: data.description || undefined,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
          fromEmail: data.fromEmail || undefined,
          fromName: data.fromName || undefined,
          replyTo: data.replyTo || undefined,
          placeholders: data.placeholders,
        }
        await createTemplate.mutateAsync(createData)
      }
      onSuccess?.()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!!template} placeholder="welcome-email" />
                </FormControl>
                <FormDescription>
                  Unique identifier (lowercase, numbers, hyphens only)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!!template}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Welcome Email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="notifications">Notifications</SelectItem>
                    <SelectItem value="invitations">Invitations</SelectItem>
                    <SelectItem value="alerts">Alerts</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
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
                <Textarea {...field} rows={2} placeholder="Template description..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Welcome to {{appName}}!" />
              </FormControl>
              <FormDescription>
                Use {'{{'} placeholderName {'}}'} for dynamic content
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="htmlBody"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTML Body</FormLabel>
              <FormControl>
                <TipTapEditorWithPlaceholders
                  content={field.value}
                  onChange={field.onChange}
                  placeholder="Enter HTML content..."
                  mode="email"
                  placeholderDefinitions={placeholders}
                  showToolbar={true}
                  minHeight="300px"
                  maxHeight="600px"
                />
              </FormControl>
              <FormDescription>
                HTML version of the email. Type {'{{'} to insert placeholders.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="textBody"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Text Body</FormLabel>
              <FormControl>
                <TipTapEditorWithPlaceholders
                  content={field.value}
                  onChange={field.onChange}
                  placeholder="Enter plain text content..."
                  mode="plain"
                  placeholderDefinitions={placeholders}
                  showToolbar={false}
                  minHeight="200px"
                  maxHeight="400px"
                />
              </FormControl>
              <FormDescription>
                Plain text version of the email. Type {'{{'} to insert placeholders.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fromEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="noreply@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fromName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Name (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="App Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="replyTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reply To (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="support@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <Label>Placeholders</Label>
          <div className="flex gap-2">
            <Input
              value={placeholderInput}
              onChange={(e) => setPlaceholderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addPlaceholder()
                }
              }}
              placeholder="placeholder-name"
            />
            <Button type="button" onClick={addPlaceholder}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {placeholders.map((placeholder, index) => (
            <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={placeholder.name}
                  onChange={(e) => {
                    const updated = [...placeholders]
                    updated[index].name = e.target.value
                    form.setValue("placeholders", updated)
                  }}
                  placeholder="name"
                />
                <Input
                  value={placeholder.description}
                  onChange={(e) => {
                    const updated = [...placeholders]
                    updated[index].description = e.target.value
                    form.setValue("placeholders", updated)
                  }}
                  placeholder="Description"
                />
                <Input
                  value={placeholder.example}
                  onChange={(e) => {
                    const updated = [...placeholders]
                    updated[index].example = e.target.value
                    form.setValue("placeholders", updated)
                  }}
                  placeholder="Example value"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={placeholder.required}
                    onChange={(e) => {
                      const updated = [...placeholders]
                      updated[index].required = e.target.checked
                      form.setValue("placeholders", updated)
                    }}
                    className="rounded"
                  />
                  <Label className="text-sm">Required</Label>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePlaceholder(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
            {createTemplate.isPending || updateTemplate.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  )
}







