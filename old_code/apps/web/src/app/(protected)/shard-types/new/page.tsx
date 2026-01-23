"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
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
import { Info, Save, ArrowLeft } from "lucide-react"
import { ShardTypeCategory } from "@/types/api"
import { useCreateShardType } from "@/hooks/use-shard-type-mutations"
import { useShardTypeForm, useShardTypeFormTransform } from "@/hooks/use-shard-type-form"

export default function ShardTypeCreatePage() {
    const { t } = useTranslation('common')
    const router = useRouter()

    const CATEGORIES = [
        { value: ShardTypeCategory.DOCUMENT, label: t('shardTypes.categories.document', 'Document') },
        { value: ShardTypeCategory.DATA, label: t('shardTypes.categories.data', 'Data') },
        { value: ShardTypeCategory.MEDIA, label: t('shardTypes.categories.media', 'Media') },
        { value: ShardTypeCategory.CONFIGURATION, label: t('shardTypes.categories.configuration', 'Configuration') },
        { value: ShardTypeCategory.CUSTOM, label: t('shardTypes.categories.custom', 'Custom') },
    ]
    const createMutation = useCreateShardType()
    const { toCreateInput } = useShardTypeFormTransform()

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useShardTypeForm()

    const schema = watch("schema")
    const uiSchema = watch("uiSchema")
    const icon = watch("icon")
    const color = watch("color")
    const tags = watch("tags") || []
    const isGlobal = watch("isGlobal")

    const onSubmit = handleSubmit((formValues) => {
        const input = toCreateInput(formValues)
        createMutation.mutate(input, {
            onSuccess: (newShardType) => {
                router.push(`/shard-types/${newShardType.id}`)
            }
        })
    })

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/shard-types")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('back' as any)}
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {t('shardTypes.create.title', 'Create Shard Type')}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('shardTypes.create.subtitle', 'Define a new schema for your shards')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={onSubmit}
                            disabled={createMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {createMutation.isPending ? t('shardTypes.create.creating', 'Creating...') : t('shardTypes.create.createButton', 'Create Shard Type')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Form */}
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('shardTypes.form.basicInfo', 'Basic Information')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.form.basicInfoDesc', 'Core details about this shard type')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        {t('shardTypes.form.name', 'Name (System Identifier)')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder={t('shardTypes.form.namePlaceholder', 'e.g., invoice, customer-profile')}
                                        {...register("name", { required: true })}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{t('shardTypes.form.nameRequired', 'Name is required')}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {t('shardTypes.form.nameHelp', 'Lowercase, kebab-case identifier (no spaces)')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="displayName">
                                        {t('shardTypes.form.displayName', 'Display Name')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="displayName"
                                        placeholder={t('shardTypes.form.displayNamePlaceholder', 'e.g., Invoice, Customer Profile')}
                                        {...register("displayName", { required: true })}
                                    />
                                    {errors.displayName && (
                                        <p className="text-sm text-destructive">{t('shardTypes.form.displayNameRequired', 'Display name is required')}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">{t('description' as any)}</Label>
                                    <Textarea
                                        id="description"
                                        placeholder={t('shardTypes.form.descriptionPlaceholder', 'Describe what this shard type represents...')}
                                        rows={3}
                                        {...register("description")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">
                                        {t('shardTypes.form.category', 'Category')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={watch("category")}
                                        onValueChange={(value) => setValue("category", value as any)}
                                    >
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder={t('shardTypes.form.selectCategory', 'Select a category')} />
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
                                        onCheckedChange={(checked) =>
                                            setValue("isGlobal", checked as boolean)
                                        }
                                    />
                                    <label
                                        htmlFor="isGlobal"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {t('shardTypes.form.makeGlobal', 'Make this a global/shared type')}
                                    </label>
                                </div>
                                {isGlobal && (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            {t('shardTypes.form.globalWarning', 'Global types are available across all tenants and cannot be modified or deleted by individual tenants.')}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Schema Definition */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('shardTypes.form.schemaDefinition', 'Schema Definition')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.form.schemaDefinitionDesc', 'Define the structure and validation rules (JSON Schema)')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SchemaBuilderTabs
                                    value={schema as Record<string, any>}
                                    onChange={(newSchema) => setValue("schema", newSchema)}
                                />
                            </CardContent>
                        </Card>

                        {/* UI Customization */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('shardTypes.form.uiCustomization', 'UI Customization (Optional)')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.form.uiCustomizationDesc', 'Customize how forms are rendered for this type')}
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
                                <CardTitle>{t('shardTypes.form.visualIdentity', 'Visual Identity')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.form.visualIdentityDesc', 'Icon and color for easy identification')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('shardTypes.form.icon', 'Icon')}</Label>
                                        <IconPicker
                                            value={icon || "File"}
                                            onChange={(newIcon) => setValue("icon", newIcon)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('shardTypes.form.color', 'Color')}</Label>
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
                                <CardTitle>{t('shardTypes.form.organization', 'Organization')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.form.organizationDesc', 'Tags and inheritance for better organization')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('shardTypes.form.tags', 'Tags')}</Label>
                                    <TagsInput
                                        value={tags}
                                        onChange={(newTags) => setValue("tags", newTags)}
                                        placeholder={t('shardTypes.form.tagsPlaceholder', 'Add tags...')}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('shardTypes.form.tagsHelp', 'Tags help organize and find shard types')}
                                    </p>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label>{t('shardTypes.form.parentType', 'Parent Shard Type (Inheritance)')}</Label>
                                    <ParentTypeSelector
                                        value={watch("parentShardTypeId")}
                                        onChange={(parentId) =>
                                            setValue("parentShardTypeId", parentId)
                                        }
                                        currentTypeId={undefined}
                                        availableTypes={[]} // TODO: Load from API
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('shardTypes.form.parentTypeHelp', 'Inherit schema fields from another shard type')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
