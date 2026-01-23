"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Loader2, Save, Plus, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCreatePromptABTest } from "@/hooks/use-prompt-ab-tests"
import { InsightType } from "@/types/prompts"
import { usePrompts } from "@/hooks/use-prompts"
import Link from "next/link"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

const INSIGHT_TYPES = [
  { value: InsightType.Summary, label: "Summary" },
  { value: InsightType.Analysis, label: "Analysis" },
  { value: InsightType.Comparison, label: "Comparison" },
  { value: InsightType.Recommendation, label: "Recommendation" },
  { value: InsightType.Prediction, label: "Prediction" },
  { value: InsightType.Extraction, label: "Extraction" },
  { value: InsightType.Search, label: "Search" },
  { value: InsightType.Generation, label: "Generation" },
] as const

const PRIMARY_METRICS = [
  { value: "quality", label: "Quality" },
  { value: "latency", label: "Latency" },
  { value: "satisfaction", label: "User Satisfaction" },
  { value: "cost", label: "Cost" },
  { value: "success_rate", label: "Success Rate" },
] as const

const experimentFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    insightType: z.nativeEnum(InsightType),
    slug: z.string().optional(),
    variants: z
      .array(
        z.object({
          variantId: z.string().min(1, "Variant ID is required"),
          promptId: z.string().min(1, "Prompt ID is required"),
          promptSlug: z.string().min(1, "Prompt slug is required"),
          name: z.string().min(1, "Variant name is required"),
          trafficPercentage: z.number().min(0).max(100),
          description: z.string().optional(),
        })
      )
      .min(2, "At least 2 variants are required"),
    primaryMetric: z.enum(["quality", "latency", "satisfaction", "cost", "success_rate"]),
    successCriteria: z
      .object({
        metric: z.string().min(1, "Metric is required"),
        operator: z.enum([">", ">=", "<", "<="]),
        threshold: z.number(),
        confidenceLevel: z.number().min(0).max(1),
      })
      .optional(),
    targeting: z
      .object({
        tenantIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      })
      .optional(),
    minDuration: z.number().min(1).optional(),
    minSamplesPerVariant: z.number().min(1).optional(),
  })
  .refine(
    (data) => {
      const total = data.variants.reduce((sum, v) => sum + v.trafficPercentage, 0)
      return Math.abs(total - 100) < 0.01
    },
    {
      message: "Traffic percentages must sum to 100%",
      path: ["variants"],
    }
  )

type ExperimentFormValues = z.infer<typeof experimentFormSchema>

export default function NewPromptABTestPage() {
  const router = useRouter()
  const createMutation = useCreatePromptABTest()

  const form = useForm<ExperimentFormValues>({
    resolver: zodResolver(experimentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      hypothesis: "",
      insightType: InsightType.Summary,
      slug: "",
      variants: [
        {
          variantId: "control",
          promptId: "",
          promptSlug: "",
          name: "Control",
          trafficPercentage: 50,
          description: "",
        },
        {
          variantId: "treatment",
          promptId: "",
          promptSlug: "",
          name: "Treatment",
          trafficPercentage: 50,
          description: "",
        },
      ],
      primaryMetric: "quality",
      successCriteria: undefined,
      targeting: undefined,
      minDuration: 7,
      minSamplesPerVariant: 100,
    },
  })

  // Watch insight type to filter prompts
  const selectedInsightType = form.watch("insightType")
  
  // Fetch prompts filtered by insight type
  const { data: availablePrompts, isLoading: promptsLoading } = usePrompts({
    insightType: selectedInsightType,
    enabled: !!selectedInsightType,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  })

  const variants = form.watch("variants")
  const totalTraffic = variants.reduce((sum, v) => sum + (v.trafficPercentage || 0), 0)
  const trafficError = Math.abs(totalTraffic - 100) > 0.01

  const onSubmit = async (data: ExperimentFormValues) => {
    try {
      await createMutation.mutateAsync(data)
      router.push("/admin/ai-settings/prompt-ab-tests")
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to create experiment", 3, {
        errorMessage: errorObj.message,
      })
    }
  }

  const addVariant = () => {
    append({
      variantId: `variant-${fields.length + 1}`,
      promptId: "",
      promptSlug: "",
      name: `Variant ${fields.length + 1}`,
      trafficPercentage: 0,
      description: "",
    })
  }

  const removeVariant = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  // Auto-adjust traffic percentages when variants change
  const adjustTrafficPercentages = () => {
    const currentVariants = form.getValues("variants")
    const equalShare = 100 / currentVariants.length
    const adjusted = currentVariants.map((v) => ({
      ...v,
      trafficPercentage: equalShare,
    }))
    form.setValue("variants", adjusted)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/ai-settings/prompt-ab-tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create A/B Test Experiment</h1>
          <p className="text-muted-foreground">
            Set up a new prompt A/B test to compare variant performance
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about the experiment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experiment Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GPT-4 vs GPT-4o Prompt Comparison" {...field} />
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
                        placeholder="Describe the purpose and goals of this experiment"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hypothesis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hypothesis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What do you expect to learn from this experiment?"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional: State your hypothesis about which variant will perform better
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="insightType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insight Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select insight type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INSIGHT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of insight this experiment applies to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Slug (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., summary-v2"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Specific prompt slug to test. Leave empty to test all prompts of
                        this insight type.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variants</CardTitle>
                  <CardDescription>
                    Define the prompt variants to test (minimum 2 required)
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {trafficError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Traffic percentages must sum to 100%. Current total: {totalTraffic.toFixed(1)}%
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adjustTrafficPercentages}
                >
                  Distribute Equally
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Variant {index + 1}</CardTitle>
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`variants.${index}.variantId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Variant ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., control, treatment" {...field} />
                            </FormControl>
                            <FormDescription>Unique identifier for this variant</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Variant Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Control, Treatment A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`variants.${index}.promptId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt *</FormLabel>
                            <Select
                              value={field.value || ""}
                              onValueChange={(value) => {
                                // Find the selected prompt and auto-fill both ID and slug
                                const selectedPrompt = availablePrompts?.find((p) => p.id === value)
                                if (selectedPrompt) {
                                  field.onChange(selectedPrompt.id)
                                  form.setValue(
                                    `variants.${index}.promptSlug`,
                                    selectedPrompt.slug
                                  )
                                } else {
                                  field.onChange(value)
                                }
                              }}
                              disabled={!selectedInsightType || promptsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      !selectedInsightType
                                        ? "Select insight type first"
                                        : promptsLoading
                                        ? "Loading prompts..."
                                        : "Select a prompt"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availablePrompts && availablePrompts.length > 0 ? (
                                  availablePrompts
                                    .filter((p) => p.status === "active")
                                    .map((prompt) => (
                                      <SelectItem key={prompt.id} value={prompt.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{prompt.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {prompt.slug} {prompt.version ? `(v${prompt.version})` : ""}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No active prompts found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {selectedInsightType
                                ? "Select a prompt to test (only active prompts shown)"
                                : "Select an insight type above to see available prompts"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.promptSlug`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt Slug *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., summary-v1"
                                {...field}
                                value={field.value || ""}
                                readOnly
                                className="bg-muted"
                              />
                            </FormControl>
                            <FormDescription>
                              Auto-filled from selected prompt
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`variants.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what makes this variant different"
                              className="resize-none"
                              rows={2}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`variants.${index}.trafficPercentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Traffic Percentage *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage of traffic to allocate to this variant (0-100%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Experiment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Experiment Configuration</CardTitle>
              <CardDescription>Define success criteria and experiment parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="primaryMetric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Metric *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary metric" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIMARY_METRICS.map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The main metric used to determine experiment success
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value || 7}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                        />
                      </FormControl>
                      <FormDescription>Minimum days to run the experiment</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minSamplesPerVariant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Samples per Variant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value || 100}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum number of samples needed before determining a winner
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/admin/ai-settings/prompt-ab-tests">
              <Button type="button" variant="outline" disabled={createMutation.isPending}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending || trafficError}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Experiment
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

