"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Search,
  X,
  Globe,
  Lock,
  Tag,
  Paperclip,
  Settings,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCreateShard, useShardTypes } from "@/hooks/use-shards"
import { useShardType } from "@/hooks/use-shard-types"
import { DynamicShardForm } from "@/components/shard/dynamic-shard-form"
import { JsonEditor } from "@/components/json-editor"
import { FileUpload } from "@/components/file-upload"
import { cn } from "@/lib/utils"
import type { ShardType, CreateShardDto } from "@/types/api"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

// Wizard steps
const STEPS = ["selectType", "basicInfo", "schemaFields", "additionalData", "review"] as const
type Step = typeof STEPS[number]

// Form data structure
interface ShardFormData {
  shardTypeId: string
  name: string
  description: string
  content: string
  tags: string[]
  isPublic: boolean
  metadata: Record<string, unknown>
  unstructuredData: Record<string, unknown>
  files: File[]
}

const initialFormData: ShardFormData = {
  shardTypeId: "",
  name: "",
  description: "",
  content: "",
  tags: [],
  isPublic: false,
  metadata: {},
  unstructuredData: {},
  files: [],
}

export default function NewShardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['shards', 'common'])
  const router = useRouter()
  const createShard = useCreateShard()

  // Wizard state
  const [currentStep, setCurrentStep] = React.useState<Step>("selectType")
  const [formData, setFormData] = React.useState<ShardFormData>(initialFormData)

  // Type selection state
  const [typeSearch, setTypeSearch] = React.useState("")

  // Fetch all shard types
  const { data: shardTypesData, isLoading: isLoadingTypes } = useShardTypes()
  const shardTypes = shardTypesData || []

  // Fetch selected shard type details
  const { data: selectedType, isLoading: isLoadingSelectedType } = useShardType(
    formData.shardTypeId,
    { enabled: !!formData.shardTypeId }
  )

  // Filter shard types by search
  const filteredTypes = React.useMemo(() => {
    if (!typeSearch) return shardTypes
    const search = typeSearch.toLowerCase()
    return shardTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(search) ||
        type.displayName?.toLowerCase().includes(search) ||
        type.description?.toLowerCase().includes(search)
    )
  }, [shardTypes, typeSearch])

  // Group types by system vs custom
  const groupedTypes = React.useMemo(() => {
    const system = filteredTypes.filter((t) => t.isSystem || t.isBuiltIn)
    const custom = filteredTypes.filter((t) => !t.isSystem && !t.isBuiltIn)
    return { system, custom }
  }, [filteredTypes])

  // Step index for progress
  const stepIndex = STEPS.indexOf(currentStep)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  // Navigation
  const goToStep = (step: Step) => setCurrentStep(step)
  const nextStep = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }
  const prevStep = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }

  // Check if can proceed to next step
  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case "selectType":
        return !!formData.shardTypeId
      case "basicInfo":
        return formData.name.trim().length > 0
      case "schemaFields":
        return true // Validation handled by form
      case "additionalData":
        return true
      case "review":
        return true
      default:
        return false
    }
  }, [currentStep, formData])

  // Handle type selection
  const selectType = (type: ShardType) => {
    setFormData((prev) => ({ ...prev, shardTypeId: type.id, metadata: {} }))
  }

  // Handle form data updates
  const updateFormData = <K extends keyof ShardFormData>(key: K, value: ShardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Handle tag input
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const input = e.currentTarget
      const tag = input.value.trim()
      if (tag && !formData.tags.includes(tag)) {
        updateFormData("tags", [...formData.tags, tag])
        input.value = ""
      }
    }
  }

  const removeTag = (tag: string) => {
    updateFormData("tags", formData.tags.filter((t) => t !== tag))
  }

  // Handle schema form submission (metadata)
  const handleSchemaSubmit = async (data: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, metadata: data }))
    nextStep()
  }

  // Handle final submission
  const handleSubmit = async () => {
    try {
      const shardData: CreateShardDto = {
        name: formData.name,
        description: formData.description || undefined,
        content: formData.content || undefined,
        shardTypeId: formData.shardTypeId,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        isPublic: formData.isPublic,
        // Send schema-driven fields as structuredData instead of metadata
        structuredData: Object.keys(formData.metadata).length > 0 ? formData.metadata : undefined,
        unstructuredData: Object.keys(formData.unstructuredData).length > 0 ? formData.unstructuredData : undefined,
      }

      // TODO: Handle file uploads when backend supports it
      await createShard.mutateAsync(shardData)
      toast.success(t('shards:messages.createSuccess' as any))
      router.push("/shards")
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to create shard", 3, {
        errorMessage: errorObj.message,
        shardTypeId: formData.shardTypeId,
      })
      // Error toast handled by mutation
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t('shards:wizard.title' as any)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('shards:form.step', { current: stepIndex + 1, total: STEPS.length })}
              </p>
            </div>
          </div>
          
          {/* Step indicator */}
          <div className="hidden md:flex items-center gap-2">
            {STEPS.map((step, index) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => index <= stepIndex && goToStep(step)}
                  disabled={index > stepIndex}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    index === stepIndex
                      ? "bg-primary text-primary-foreground"
                      : index < stepIndex
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < stepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="w-4 text-center">{index + 1}</span>
                  )}
                  <span className="hidden lg:inline">
                    {t(`shards:form.${step}Step` as any)}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5",
                    index < stepIndex ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Progress bar (mobile) */}
        <Progress value={progress} className="h-1 rounded-none md:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Select Type */}
          {currentStep === "selectType" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('shards:wizard.selectType.title' as any)}
                </CardTitle>
                <CardDescription>
                  {t('shards:wizard.selectType.description' as any)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('shards:wizard.selectType.search' as any)}
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isLoadingTypes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTypes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t('shards:wizard.selectType.noTypes' as any)}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    {/* System types */}
                    {groupedTypes.system.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          {t('shards:wizard.selectType.system' as any)}
                        </h3>
                        <div className="grid gap-2">
                          {groupedTypes.system.map((type) => (
                            <TypeCard
                              key={type.id}
                              type={type}
                              isSelected={formData.shardTypeId === type.id}
                              onSelect={() => selectType(type)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom types */}
                    {groupedTypes.custom.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          {t('shards:wizard.selectType.custom' as any)}
                        </h3>
                        <div className="grid gap-2">
                          {groupedTypes.custom.map((type) => (
                            <TypeCard
                              key={type.id}
                              type={type}
                              isSelected={formData.shardTypeId === type.id}
                              onSelect={() => selectType(type)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === "basicInfo" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t('shards:wizard.basicInfo.title' as any)}
                </CardTitle>
                <CardDescription>
                  {t('shards:wizard.basicInfo.description' as any)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t('shards:form.name' as any)} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    placeholder={t('shards:form.namePlaceholder' as any)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.nameDescription' as any)}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t('shards:form.description' as any)}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder={t('shards:form.descriptionPlaceholder' as any)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.descriptionHelp' as any)}
                  </p>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">{t('shards:form.content' as any)}</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => updateFormData("content", e.target.value)}
                    placeholder={t('shards:form.contentPlaceholder' as any)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.contentDescription' as any)}
                  </p>
                </div>

                <Separator />

                {/* Tags */}
                <div className="space-y-2">
                  <Label>{t('shards:form.tags' as any)}</Label>
                  <Input
                    placeholder={t('shards:form.tagsPlaceholder' as any)}
                    onKeyDown={handleTagInput}
                  />
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.tagsDescription' as any)}
                  </p>
                </div>

                {/* Visibility */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {formData.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {t('shards:form.visibility' as any)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {formData.isPublic
                        ? t('shards:form.isPublicLabel' as any)
                        : t('shards:form.isPrivateLabel' as any)}
                    </p>
                  </div>
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => updateFormData("isPublic", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Schema Fields */}
          {currentStep === "schemaFields" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('shards:wizard.schemaFields.title' as any)}
                </CardTitle>
                <CardDescription>
                  {t('shards:wizard.schemaFields.description', {
                    type: selectedType?.displayName || selectedType?.name || "shard",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSelectedType ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedType && Object.keys(selectedType.schema?.properties || {}).length > 0 ? (
                  <DynamicShardForm
                    shardType={selectedType}
                    initialData={formData.metadata}
                    onSubmit={handleSchemaSubmit}
                    mode="create"
                    submitLabel={t('shards:form.next' as any)}
                    cancelLabel={t('shards:form.back' as any)}
                    onCancel={prevStep}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>This shard type has no custom fields.</p>
                    <Button className="mt-4" onClick={nextStep}>
                      {t('shards:form.next' as any)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Additional Data */}
          {currentStep === "additionalData" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  {t('shards:wizard.additionalData.title' as any)}
                </CardTitle>
                <CardDescription>
                  {t('shards:wizard.additionalData.description' as any)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Attachments */}
                <div className="space-y-2">
                  <Label>{t('shards:form.attachments' as any)}</Label>
                  <FileUpload
                    onFilesChange={(files) => updateFormData("files", files)}
                    maxFiles={10}
                    maxSizeMB={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.attachmentsDescription' as any)}
                  </p>
                </div>

                <Separator />

                {/* Unstructured Data */}
                <div className="space-y-2">
                  <Label>{t('shards:form.unstructuredData' as any)}</Label>
                  <JsonEditor
                    value={formData.unstructuredData}
                    onChange={(value) => updateFormData("unstructuredData", value)}
                    height="250px"
                    title=""
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shards:form.unstructuredDataDescription' as any)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {currentStep === "review" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t('shards:wizard.review.title' as any)}
                </CardTitle>
                <CardDescription>
                  {t('shards:wizard.review.description' as any)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="space-y-4">
                  <h3 className="font-medium">{t('shards:wizard.review.summary' as any)}</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('shards:form.name' as any)}</p>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('shards:form.type' as any)}</p>
                      <Badge variant="outline">
                        {selectedType?.displayName || selectedType?.name}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('shards:form.visibility' as any)}</p>
                      <div className="flex items-center gap-2">
                        {formData.isPublic ? (
                          <>
                            <Globe className="h-4 w-4 text-green-600" />
                            <span>{t('shards:visibility.public' as any)}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span>{t('shards:visibility.private' as any)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('shards:form.tags' as any)}</p>
                        <div className="flex flex-wrap gap-1">
                          {formData.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {formData.description && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('shards:form.description' as any)}</p>
                      <p className="text-sm">{formData.description}</p>
                    </div>
                  )}

                  {formData.content && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('shards:form.content' as any)}</p>
                      <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-[200px]">
                        {formData.content}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Data */}
                {Object.keys(formData.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-medium">Data</h3>
                      <div className="rounded-md border bg-card">
                        <ul className="divide-y">
                          {Object.entries(formData.metadata).map(([key, value]) => (
                            <li key={key} className="flex items-start justify-between p-3">
                              <span className="text-sm font-medium">{key}</span>
                              <span className="text-sm text-muted-foreground break-all">
                                {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                                  ? String(value)
                                  : JSON.stringify(value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {/* Attachments */}
                {formData.files.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-medium">{t('shards:wizard.review.attachments' as any)}</h3>
                      <div className="space-y-1">
                        {formData.files.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span>{file.name}</span>
                            <span className="text-muted-foreground">
                              ({(file.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 border-t bg-background px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={currentStep === "selectType" ? () => router.back() : prevStep}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('shards:form.back' as any)}
          </Button>

          {currentStep !== "review" ? (
            currentStep !== "schemaFields" && (
              <Button onClick={nextStep} disabled={!canProceed}>
                {t('shards:form.next' as any)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )
          ) : (
            <Button onClick={handleSubmit} disabled={createShard.isPending}>
              {createShard.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Check className="mr-2 h-4 w-4" />
              {t('shards:form.createShard' as any)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Type card component
function TypeCard({
  type,
  isSelected,
  onSelect,
}: {
  type: ShardType
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
        style={type.color ? { backgroundColor: type.color, color: "#fff" } : undefined}
      >
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {type.displayName || type.name}
          </span>
          {isSelected && (
            <Check className="h-4 w-4 text-primary shrink-0" />
          )}
        </div>
        {type.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {type.description}
          </p>
        )}
        {type.tags && type.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {type.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
