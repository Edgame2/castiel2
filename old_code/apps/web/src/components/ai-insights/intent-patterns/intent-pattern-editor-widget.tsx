"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateIntentPattern, useUpdateIntentPattern } from "@/hooks/use-insights"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, Plus, X } from "lucide-react"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

const intentTypes = ['summary', 'analysis', 'comparison', 'recommendation', 'prediction', 'extraction', 'search', 'generation'] as const

const patternSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  intentType: z.enum(intentTypes),
  subtype: z.string().optional(),
  patterns: z.array(z.string().min(1, "Pattern cannot be empty")).min(1, "At least one pattern is required"),
  keywords: z.array(z.string()).optional(),
  phrases: z.array(z.string()).optional(),
  priority: z.number().min(1).max(10).default(5),
  confidenceWeight: z.number().min(0.1).max(2.0).default(1.0),
  excludePatterns: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
})

type PatternFormValues = z.infer<typeof patternSchema>

interface IntentPattern {
  id: string
  name: string
  description: string
  intentType: string
  subtype?: string
  patterns: string[]
  keywords: string[]
  phrases: string[]
  priority: number
  confidenceWeight: number
  excludePatterns?: string[]
  isActive: boolean
}

interface IntentPatternEditorWidgetProps {
  pattern?: IntentPattern
  onCancel?: () => void
  onSaved?: () => void
}

export function IntentPatternEditorWidget({
  pattern,
  onCancel,
  onSaved,
}: IntentPatternEditorWidgetProps) {
  const isEditing = !!pattern
  const createMutation = useCreateIntentPattern()
  const updateMutation = useUpdateIntentPattern()

  const form = useForm<PatternFormValues>({
    resolver: zodResolver(patternSchema) as any,
    defaultValues: {
      name: pattern?.name || "",
      description: pattern?.description || "",
      intentType: (pattern?.intentType as any) || "summary",
      subtype: pattern?.subtype || "",
      patterns: pattern?.patterns || [""],
      keywords: pattern?.keywords || [],
      phrases: pattern?.phrases || [],
      priority: pattern?.priority || 5,
      confidenceWeight: pattern?.confidenceWeight || 1.0,
      excludePatterns: pattern?.excludePatterns || [],
      isActive: pattern?.isActive ?? true,
    },
  })

  const { fields: patternFields, append: appendPattern, remove: removePattern } = useFieldArray({
    control: form.control as any,
    name: "patterns",
  })

  const { fields: keywordFields, append: appendKeyword, remove: removeKeyword } = useFieldArray({
    control: form.control as any,
    name: "keywords",
  })

  const { fields: phraseFields, append: appendPhrase, remove: removePhrase } = useFieldArray({
    control: form.control as any,
    name: "phrases",
  })

  const { fields: excludeFields, append: appendExclude, remove: removeExclude } = useFieldArray({
    control: form.control as any,
    name: "excludePatterns",
  })

  const onSubmit = async (data: PatternFormValues) => {
    try {
      const payload = {
        ...data,
        keywords: data.keywords?.filter(Boolean) || [],
        phrases: data.phrases?.filter(Boolean) || [],
        excludePatterns: data.excludePatterns?.filter(Boolean) || [],
      }

      if (isEditing && pattern) {
        await updateMutation.mutateAsync({ id: pattern.id, input: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      if (onSaved) onSaved()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to save pattern", 3, {
        errorMessage: errorObj.message,
        patternId: pattern?.id,
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Intent Pattern" : "Create New Intent Pattern"}</CardTitle>
        <CardDescription>
          Define patterns for intent classification. Patterns are regex strings that will be tested against user queries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Risk Analysis Detection" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="intentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intent Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intent type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {intentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
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
                    <Textarea {...field} placeholder="Identifies queries asking about risks, concerns, or threats" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtype"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtype (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="risk" />
                  </FormControl>
                  <FormDescription>Optional subtype for more specific classification</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Regex Patterns</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPattern("")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pattern
                </Button>
              </div>
              {patternFields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`patterns.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="/risk|danger|concern/i" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePattern(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Keywords (Optional)</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendKeyword("")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Keyword
                </Button>
              </div>
              {keywordFields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`keywords.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="risk" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKeyword(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                      />
                    </FormControl>
                    <FormDescription>Higher priority patterns are checked first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidenceWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Weight (0.1-2.0)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0.1}
                        max={2.0}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1.0)}
                      />
                    </FormControl>
                    <FormDescription>Multiplier for confidence score</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>Enable this pattern for intent classification</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update" : "Create"} Pattern
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}






