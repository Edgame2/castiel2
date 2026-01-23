"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Prompt, PromptScope, InsightType } from "@/types/prompts"
import { useCreatePrompt, useUpdatePrompt, usePreviewPrompt } from "@/hooks/use-prompts"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import { Loader2, Save, Play, X, Plus } from "lucide-react"

const promptSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
    scope: z.enum(['system', 'tenant', 'user'] as const),
    insightType: z.nativeEnum(InsightType).optional(),
    tags: z.string().optional(), // Comma separated for input
    status: z.enum(['draft', 'active', 'archived']).optional(),
    changeLog: z.string().optional(), // Change log for versioning
    template: z.object({
        systemPrompt: z.string().min(1, "System prompt is required"),
        userPrompt: z.string().min(1, "User prompt is required"),
        variables: z.array(z.string()).optional(),
    }),
})

type PromptFormValues = z.infer<typeof promptSchema>

interface PromptEditorWidgetProps {
    prompt?: Prompt;
    onCancel?: () => void;
    onSaved?: () => void;
}

export function PromptEditorWidget({ prompt, onCancel, onSaved }: PromptEditorWidgetProps) {
    const isEditing = !!prompt
    
    // Get scope from prompt or default to user
    const scope = (prompt?.scope || "user") as PromptScope
    const createPrompt = useCreatePrompt(scope)
    const updatePrompt = useUpdatePrompt(scope)
    const previewPrompt = usePreviewPrompt()

    const [previewResult, setPreviewResult] = useState<{ system: string, user: string } | null>(null)
    const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})

    const form = useForm<PromptFormValues>({
        resolver: zodResolver(promptSchema),
        defaultValues: {
            name: prompt?.name || "",
            slug: prompt?.slug || "",
            scope: prompt?.scope || "user",
            insightType: prompt?.insightType || undefined,
            status: prompt?.status || "draft",
            tags: prompt?.tags?.join(", ") || "",
            changeLog: "", // Change log for new versions
            template: {
                systemPrompt: prompt?.template.systemPrompt || "You are a helpful AI assistant.",
                userPrompt: prompt?.template.userPrompt || "",
                variables: prompt?.template.variables || [],
            },
        },
    })

    // Auto-extract variables from mustache templates
    const systemPrompt = form.watch("template.systemPrompt");
    const userPrompt = form.watch("template.userPrompt");

    useEffect(() => {
        const regex = /{{([a-zA-Z0-9_]+)}}/g;
        const vars = new Set<string>();
        let match;

        while ((match = regex.exec(systemPrompt)) !== null) vars.add(match[1]);
        while ((match = regex.exec(userPrompt)) !== null) vars.add(match[1]);

        const currentVars = form.getValues("template.variables") || [];
        const newVars = Array.from(vars);

        // Only update if different to avoid loop
        if (JSON.stringify(currentVars.sort()) !== JSON.stringify(newVars.sort())) {
            form.setValue("template.variables", newVars);
        }
    }, [systemPrompt, userPrompt, form]);

    const variables = form.watch("template.variables") || [];

    const onSubmit = async (data: PromptFormValues) => {
        const payload = {
            ...data,
            tags: data.tags ? data.tags.split("," as any).map(t => t.trim()).filter(Boolean) : [],
            // Include changeLog in metadata if editing
            ...(isEditing && data.changeLog ? { metadata: { changeLog: data.changeLog } } : {}),
        };

        try {
            if (isEditing && prompt) {
                await updatePrompt.mutateAsync({ id: prompt.id, data: payload });
            } else {
                await createPrompt.mutateAsync(payload);
            }
            if (onSaved) onSaved();
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to save prompt", 3, {
                errorMessage: errorObj.message,
                promptId: prompt?.id,
            })
        }
    }

    const handlePreview = async () => {
        const { template } = form.getValues();
        try {
            const result = await previewPrompt.mutateAsync({
                template,
                variables: previewVariables
            });
            setPreviewResult({ system: result.systemPrompt, user: result.userPrompt });
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Preview failed", 3, {
                errorMessage: errorObj.message,
            })
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{isEditing ? "Edit Prompt" : "Create New Prompt"}</CardTitle>
                <CardDescription>
                    Define your prompt templates and variables.
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
                                            <Input placeholder="My Custom Prompt" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Slug</FormLabel>
                                        <FormControl>
                                            <Input placeholder="my-custom-prompt" {...field} disabled={isEditing} />
                                        </FormControl>
                                        <FormDescription>Unique identifier.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="scope"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Scope</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select scope" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="tenant">Tenant</SelectItem>
                                                <SelectItem value="system">System</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="insightType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Insight Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type (optional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={InsightType.Summary}>Summary</SelectItem>
                                                <SelectItem value={InsightType.Analysis}>Analysis</SelectItem>
                                                <SelectItem value={InsightType.Comparison}>Comparison</SelectItem>
                                                <SelectItem value={InsightType.Recommendation}>Recommendation</SelectItem>
                                                <SelectItem value={InsightType.Prediction}>Prediction</SelectItem>
                                                <SelectItem value={InsightType.Extraction}>Extraction</SelectItem>
                                                <SelectItem value={InsightType.Search}>Search</SelectItem>
                                                <SelectItem value={InsightType.Generation}>Generation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <Input placeholder="sales, q1, draft" {...field} />
                                        </FormControl>
                                        <FormDescription>Comma separated tags.</FormDescription>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value || "draft"}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <Tabs defaultValue="edit" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="edit">Edit Template</TabsTrigger>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                </TabsList>
                                <TabsContent value="edit" className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="template.systemPrompt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>System Prompt</FormLabel>
                                                <FormControl>
                                                    <Textarea className="h-32 font-mono" {...field} />
                                                </FormControl>
                                                <FormDescription>Instructions for the AI. Use {`{{variable}}`} for dynamic content.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="template.userPrompt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>User Prompt</FormLabel>
                                                <FormControl>
                                                    <Textarea className="h-32 font-mono" {...field} />
                                                </FormControl>
                                                <FormDescription>The user message template.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="mt-2">
                                        <FormLabel>Detected Variables</FormLabel>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {variables.length > 0 ? variables.map((v) => (
                                                <Badge key={v} variant="outline">{v}</Badge>
                                            )) : <span className="text-sm text-muted-foreground">No variables detected.</span>}
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="preview" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium">Test Variables</h4>
                                            {variables.map(v => (
                                                <div key={v}>
                                                    <FormLabel className="text-xs">{v}</FormLabel>
                                                    <Input
                                                        value={previewVariables[v] || ''}
                                                        onChange={(e) => setPreviewVariables({ ...previewVariables, [v]: e.target.value })}
                                                        placeholder={`Value for ${v}`}
                                                    />
                                                </div>
                                            ))}
                                            <Button type="button" onClick={handlePreview} disabled={previewPrompt.isPending}>
                                                {previewPrompt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                                Run Preview
                                            </Button>
                                        </div>
                                        <div className="space-y-4 border-l pl-4">
                                            <h4 className="text-sm font-medium">Rendered Output</h4>
                                            {previewResult ? (
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs font-semibold uppercase text-muted-foreground">System</span>
                                                        <div className="p-2 bg-muted rounded-md text-sm whitespace-pre-wrap">{previewResult.system}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-semibold uppercase text-muted-foreground">User</span>
                                                        <div className="p-2 bg-muted rounded-md text-sm whitespace-pre-wrap">{previewResult.user}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">Run preview to see result.</div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {isEditing && (
                            <FormField
                                control={form.control}
                                name="changeLog"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Change Log</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Describe what changed in this version (e.g., 'Improved handling of null data values')..."
                                                className="h-20"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            This will be saved with the new version when you update the prompt.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="flex justify-end gap-2">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={createPrompt.isPending || updatePrompt.isPending}>
                                {createPrompt.isPending || updatePrompt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isEditing ? "Update Prompt (New Version)" : "Create Prompt"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
