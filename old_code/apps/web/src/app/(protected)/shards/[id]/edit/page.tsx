"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  FileText,
  Loader2,
  Save,
  Globe,
  Lock,
  Tag,
  X,
  AlertCircle,
  Settings,
  Paperclip,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useShard, useUpdateShard } from "@/hooks/use-shards"
import { useShardType } from "@/hooks/use-shard-types"
import { DynamicShardForm } from "@/components/shard/dynamic-shard-form"
import { JsonEditor } from "@/components/json-editor"
import { FileUpload } from "@/components/file-upload"
import { cn } from "@/lib/utils"
import type { UpdateShardDto } from "@/types/api"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface EditShardPageProps {
  params: Promise<{ id: string }>
}

export default function EditShardPage({ params }: EditShardPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['shards', 'common'])
  const { id } = use(params)
  const router = useRouter()

  // Fetch shard data
  const { data: shard, isLoading: shardLoading, error: shardError } = useShard(id)
  
  // Fetch shard type for schema-aware editing
  const { data: shardType, isLoading: typeLoading } = useShardType(
    shard?.shardTypeId || "",
    { enabled: !!shard?.shardTypeId }
  )

  const updateShard = useUpdateShard()

  // Form state
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [content, setContent] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [isPublic, setIsPublic] = React.useState(false)
  const [metadata, setMetadata] = React.useState<Record<string, unknown>>({})
  const [unstructuredData, setUnstructuredData] = React.useState<Record<string, unknown>>({})
  const [files, setFiles] = React.useState<File[]>([])
  const [isDirty, setIsDirty] = React.useState(false)

  // Initialize form state from shard data
  React.useEffect(() => {
    if (shard) {
      setName(shard.name)
      setDescription(shard.description || "")
      setContent(shard.content || "")
      setTags(shard.tags || [])
      setIsPublic(shard.isPublic)
      setMetadata(shard.metadata || {})
      setUnstructuredData(shard.unstructuredData || {})
      setIsDirty(false)
    }
  }, [shard])

  // Track changes
  const markDirty = () => setIsDirty(true)

  // Tag handling
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const input = e.currentTarget
      const tag = input.value.trim()
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag])
        markDirty()
        input.value = ""
      }
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
    markDirty()
  }

  // Handle metadata form submission
  const handleMetadataSubmit = async (data: Record<string, unknown>) => {
    setMetadata(data)
    markDirty()
    toast.success("Schema fields updated")
  }

  // Handle save
  const handleSave = async () => {
    try {
      const updateData: UpdateShardDto = {
        name,
        description: description || undefined,
        content: content || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPublic,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        unstructuredData: Object.keys(unstructuredData).length > 0 ? unstructuredData : undefined,
      }

      await updateShard.mutateAsync({ id, data: updateData })
      toast.success(t('shards:messages.updateSuccess' as any))
      setIsDirty(false)
      router.push(`/shards/${id}`)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to update shard", 3, {
        errorMessage: errorObj.message,
        shardId: id,
      })
      // Error toast handled by mutation
    }
  }

  // Warn about unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  // Loading state
  if (shardLoading || typeLoading) {
    return <EditShardSkeleton />
  }

  // Error state
  if (shardError || !shard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-6">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">{t('shards:detail.notFound' as any)}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('shards:detail.notFoundDescription' as any)}
        </p>
        <Button onClick={() => router.push("/shards")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('shards:backToShards' as any)}
        </Button>
      </div>
    )
  }

  // No shard type found
  if (!shardType) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('shards:edit' as any)}</h1>
            <p className="text-muted-foreground">{shard.name}</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Shard Type Not Found</AlertTitle>
          <AlertDescription>
            Cannot edit shard without its type definition. The shard type "{shard.shardTypeId}" may have been deleted.
          </AlertDescription>
        </Alert>

        <Button onClick={() => router.push(`/shards/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shard
        </Button>
      </div>
    )
  }

  const hasSchemaFields = Object.keys(shardType.schema?.properties || {}).length > 0

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isDirty) {
                  if (confirm(t('common:unsavedChanges' as any))) {
                    router.push(`/shards/${id}`)
                  }
                } else {
                  router.push(`/shards/${id}`)
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('shards:edit' as any)}</h1>
              <p className="text-sm text-muted-foreground">
                {t('shards:editSubtitle', {
                  name: shard.name,
                  type: shardType.displayName || shardType.name,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Unsaved changes
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/shards/${id}`)}
            >
              {t('common:cancel' as any)}
            </Button>
            <Button onClick={handleSave} disabled={updateShard.isPending || !isDirty}>
              {updateShard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('shards:form.saving' as any)}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common:save' as any)}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic
              </TabsTrigger>
              {hasSchemaFields && (
                <TabsTrigger value="schema" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {shardType.displayName || "Fields"}
                </TabsTrigger>
              )}
              <TabsTrigger value="additional" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Additional
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Edit the core details of your shard
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
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        markDirty()
                      }}
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
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value)
                        markDirty()
                      }}
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
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value)
                        markDirty()
                      }}
                      placeholder={t('shards:form.contentPlaceholder' as any)}
                      rows={6}
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
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((tag) => (
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
                        {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {t('shards:form.visibility' as any)}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isPublic
                          ? t('shards:form.isPublicLabel' as any)
                          : t('shards:form.isPrivateLabel' as any)}
                      </p>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={(checked) => {
                        setIsPublic(checked)
                        markDirty()
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schema Fields Tab */}
            {hasSchemaFields && (
              <TabsContent value="schema">
                <Card>
                  <CardHeader>
                    <CardTitle>{shardType.displayName || shardType.name} Fields</CardTitle>
                    <CardDescription>
                      {shardType.description || "Edit the schema-defined fields for this shard type"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DynamicShardForm
                      shardType={shardType}
                      initialData={metadata}
                      onSubmit={handleMetadataSubmit}
                      mode="edit"
                      submitLabel="Update Fields"
                      columns={2}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Additional Data Tab */}
            <TabsContent value="additional">
              <div className="space-y-6">
                {/* Attachments */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('shards:form.attachments' as any)}</CardTitle>
                    <CardDescription>
                      {t('shards:form.attachmentsDescription' as any)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      onFilesChange={(newFiles) => {
                        setFiles(newFiles)
                        markDirty()
                      }}
                      maxFiles={10}
                      maxSizeMB={10}
                      existingFiles={shard.attachments?.map((a) => ({
                        name: a.filename,
                        url: a.url,
                      }))}
                    />
                  </CardContent>
                </Card>

                {/* Unstructured Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('shards:form.unstructuredData' as any)}</CardTitle>
                    <CardDescription>
                      {t('shards:form.unstructuredDataDescription' as any)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JsonEditor
                      value={unstructuredData}
                      onChange={(value) => {
                        setUnstructuredData(value)
                        markDirty()
                      }}
                      height="300px"
                      title=""
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton
function EditShardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    </div>
  )
}
