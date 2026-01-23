"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
    SchemaBuilderTabs,
    UISchemaEditor,
    ParentTypeSelector,
    TagsInput,
    ColorPicker,
    IconPicker,
} from "@/components/shard-types"
import { SchemaBuilderWithAI } from "@/components/shard-types/schema-builder-with-ai"
import { Info, Save, ArrowLeft, ChevronDown, ChevronUp, Wand2 } from "lucide-react"
import { ShardTypeCategory } from "@/types/api"
import { useShardType } from "@/hooks/use-shard-types"
import { useUpdateShardType } from "@/hooks/use-shard-type-mutations"
import { useShardTypeForm, useShardTypeFormTransform } from "@/hooks/use-shard-type-form"
import { Skeleton } from "@/components/ui/skeleton"
import { buildDefaultEmbeddingTemplate } from "@/lib/api/embedding-templates"
import { TemplateEditorModal } from "@/components/embedding-template/template-editor-modal"

const CATEGORIES = [
    { value: ShardTypeCategory.DOCUMENT, label: "Document" },
    { value: ShardTypeCategory.DATA, label: "Data" },
    { value: ShardTypeCategory.MEDIA, label: "Media" },
    { value: ShardTypeCategory.CONFIGURATION, label: "Configuration" },
    { value: ShardTypeCategory.CUSTOM, label: "Custom" },
]

export default function ShardTypeEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const { data: shardType, isLoading } = useShardType(id)
    const updateMutation = useUpdateShardType()
    const { toUpdateInput } = useShardTypeFormTransform()

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useShardTypeForm({
        defaultValues: shardType
    })

    React.useEffect(() => {
        if (shardType) {
            setValue('name', shardType.name)
            setValue('displayName', shardType.displayName)
            setValue('description', shardType.description || '')
            setValue('category', shardType.category as ShardTypeCategory)
            setValue('schema', shardType.schema)
            setValue('uiSchema', shardType.uiSchema || {})
            setValue('isGlobal', shardType.isGlobal)
            setValue('icon', shardType.icon || 'File')
            setValue('color', shardType.color || '#3b82f6')
            setValue('tags', shardType.tags || [])
            setValue('parentShardTypeId', shardType.parentShardTypeId)
        }
    }, [shardType, setValue])

    const schema = (watch("schema") as any) || { type: "object", properties: {} }
    const schemaObject = React.useMemo(() => {
        try {
            const parsed = typeof schema === 'string' ? JSON.parse(schema) : schema
            // Ensure schema has proper JSON Schema structure
            if (!parsed || typeof parsed !== 'object') {
                return { type: 'object', properties: {} }
            }
            // If schema exists but doesn't have properties, ensure it does
            if (!parsed.properties) {
                return { type: 'object', properties: {}, ...parsed }
            }
            // Ensure type is set
            if (!parsed.type) {
                return { type: 'object', ...parsed }
            }
            return parsed
        } catch {
            return { type: 'object', properties: {} }
        }
    }, [schema])
    const uiSchema = watch("uiSchema")
    const icon = watch("icon")
    const color = watch("color")
    const tags = watch("tags") || []
    const isGlobal = watch("isGlobal")
    const embeddingTemplate = watch("embeddingTemplate")
    const [showEmbeddingAdvanced, setShowEmbeddingAdvanced] = React.useState(false)
    const [embeddingJson, setEmbeddingJson] = React.useState<string>('')
    const [showTemplateModal, setShowTemplateModal] = React.useState(false)

    // Robust extraction of schema fields for the embedding template editor
    const schemaFieldsMemo = React.useMemo(() => {
        // Prefer current form schema parsed to object
        const s = schemaObject as any
        try {
            const obj = typeof s === 'string' ? JSON.parse(s) : s
            const props = obj?.properties
            if (props && typeof props === 'object') {
                return Object.keys(props as Record<string, unknown>)
            }
            return []
        } catch {
            return []
        }
    }, [schemaObject])

    const onSubmit = handleSubmit((formValues) => {
        const input = toUpdateInput(formValues)
        updateMutation.mutate({ id, data: input }, {
            onSuccess: () => {
                router.push(`/shard-types/${id}`)
            }
        })
    })

    if (isLoading) {
        return (
            <div className="flex h-full flex-col">
                <div className="border-b bg-background px-6 py-4">
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-48" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-32 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!shardType) {
        return (
            <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Shard Type Not Found</CardTitle>
                        <CardDescription>
                            The shard type you're looking for doesn't exist.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/shard-types")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Shard Types
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/shard-types/${id}`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Edit Shard Type
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Modify the schema definition for {shardType.displayName}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={onSubmit}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content - Same as create page */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Changes to the schema may affect existing shards of this type.
                            Use caution when modifying required fields.
                        </AlertDescription>
                    </Alert>

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Core details about this shard type
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="user-profile"
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">
                                            {errors.name.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Display Name *</Label>
                                    <Input
                                        id="displayName"
                                        placeholder="User Profile"
                                        {...register("displayName")}
                                    />
                                    {errors.displayName && (
                                        <p className="text-sm text-destructive">
                                            {errors.displayName.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what this shard type represents..."
                                    {...register("description")}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={watch("category")}
                                    onValueChange={(value) => setValue("category", value as ShardTypeCategory)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isGlobal"
                                    checked={isGlobal}
                                    onCheckedChange={(checked) => setValue("isGlobal", checked as boolean)}
                                />
                                <Label htmlFor="isGlobal" className="font-normal">
                                    Make this a global shard type (available across all tenants)
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Schema Definition */}
                    <SchemaBuilderWithAI
                        shardTypeId={id}
                        shardTypeName={shardType.name}
                        description={shardType.description}
                        value={schemaObject as Record<string, any>}
                        onChange={(newSchema) => setValue("schema", newSchema)}
                    />

                    {/* UI Customization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>UI Customization (Optional)</CardTitle>
                            <CardDescription>
                                Customize how forms are rendered for this type
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UISchemaEditor
                                value={uiSchema || {}}
                                onChange={(newUiSchema) => setValue("uiSchema", newUiSchema)}
                            />
                        </CardContent>
                    </Card>

                    {/* Visual Identity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visual Identity</CardTitle>
                            <CardDescription>
                                Icon and color for easy identification
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Icon</Label>
                                    <IconPicker
                                        value={icon || "File"}
                                        onChange={(newIcon) => setValue("icon", newIcon)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <ColorPicker
                                        value={color || "#3b82f6"}
                                        onChange={(newColor) => setValue("color", newColor)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Organization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization</CardTitle>
                            <CardDescription>
                                Tags and inheritance for better organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tags</Label>
                                <TagsInput
                                    value={tags}
                                    onChange={(newTags) => setValue("tags", newTags)}
                                    placeholder="Add tags to categorize this shard type..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Parent Shard Type (Optional)</Label>
                                <ParentTypeSelector
                                    value={watch("parentShardTypeId") || ""}
                                    onChange={(parentId) => setValue("parentShardTypeId", parentId || undefined)}
                                    currentTypeId={id}
                                    availableTypes={[]}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This shard type will inherit schema from its parent
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Embedding Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Embedding Configuration (Optional)</CardTitle>
                            <CardDescription>
                                Configure how this shard type's data is vectorized for semantic search
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowTemplateModal(true)}
                                className="w-full"
                            >
                                <Wand2 className="h-4 w-4 mr-2" />
                                {embeddingTemplate ? 'Edit' : 'Create'} Embedding Template
                            </Button>
                            {embeddingTemplate && (
                                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                    Template: <strong>{embeddingTemplate.name}</strong> ({embeddingTemplate.fields.length} fields)
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Embedding Template Modal */}
            <TemplateEditorModal
                shardTypeId={id}
                shardTypeName={shardType.displayName}
                schemaFields={schemaFieldsMemo}
                open={showTemplateModal}
                onOpenChange={setShowTemplateModal}
                onSaved={() => {
                    // Refresh shard type data to get updated template
                    // The mutation will trigger a refetch automatically
                }}
            />
        </div>
    )
}
