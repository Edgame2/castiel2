"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import {
  Pencil,
  Trash2,
  FileText,
  Calendar,
  User,
  Globe,
  Lock,
  Tag,
  Copy,
  Download,
  ExternalLink,
  ArrowLeft,
  MoreHorizontal,
  History,
  Link2,
  Share2,
  Loader2,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useShard, useDeleteShard } from "@/hooks/use-shards"
import { useShardType } from "@/hooks/use-shard-types"
import { DynamicShardForm } from "@/components/shard/dynamic-shard-form"
import { JsonViewer } from "@/components/json-editor"
import { QuickInsightPanel } from "@/components/ai-insights"
import { EmbeddingStatusPanel } from "@/components/shard/embedding-status-panel"
import { RiskOverview } from "@/components/risk-analysis/risk-overview"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

interface ShardDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ShardDetailPage({ params }: ShardDetailPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['shards', 'common'])
  const { id } = use(params)
  const router = useRouter()
  
  // Fetch shard data
  const { data: shard, isLoading: shardLoading, error: shardError } = useShard(id)
  
  // Fetch shard type for schema-aware display
  const { data: shardType, isLoading: typeLoading } = useShardType(
    shard?.shardTypeId || "",
    { enabled: !!shard?.shardTypeId }
  )

  const deleteShard = useDeleteShard()

  const handleDelete = async () => {
    try {
      await deleteShard.mutateAsync(id)
      toast.success(t('shards:messages.deleteSuccess' as any))
      router.push("/shards")
    } catch (error) {
      toast.error(t('shards:messages.deleteFailed' as any))
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(id)
    toast.success(t('common:copied' as any))
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success(t('common:copied' as any))
  }

  // Loading state
  if (shardLoading) {
    return <ShardDetailSkeleton />
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

  const hasMetadata = shard.metadata && Object.keys(shard.metadata).length > 0
  const hasContent = !!shard.content
  const hasUnstructuredData = shard.unstructuredData
  const isOpportunity = shard.shardTypeId === 'c_opportunity' || shard.shardTypeName === 'c_opportunity' && shard.unstructuredData && Object.keys(shard.unstructuredData).length > 0
  const hasAttachments = shard.attachments && shard.attachments.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/shards")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{shard.name}</h1>
              {shard.isPublic ? (
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {t('shards:visibility.public' as any)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  {t('shards:visibility.private' as any)}
                </Badge>
              )}
            </div>
            {shard.description && (
              <p className="text-muted-foreground max-w-2xl">{shard.description}</p>
            )}
            {shard.tags && shard.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {shard.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/shards/${id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t('common:edit' as any)}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common:actions' as any)}</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleCopyId}>
                <Copy className="mr-2 h-4 w-4" />
                {t('common:copyId' as any)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/shards/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('common:edit' as any)}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common:delete' as any)}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('shards:deleteConfirm.title' as any)}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('shards:deleteConfirm.message', { name: shard.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:cancel' as any)}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteShard.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('shards:detail.deleting' as any)}
                        </>
                      ) : (
                        t('common:delete' as any)
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Content Area (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for content sections */}
          <Tabs defaultValue={isOpportunity ? "risk" : hasContent ? "content" : hasMetadata ? "fields" : "json"}>
            <TabsList>
              {isOpportunity && (
                <TabsTrigger value="risk">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Risk Analysis
                </TabsTrigger>
              )}
              {hasContent && (
                <TabsTrigger value="content">{t('shards:detail.content' as any)}</TabsTrigger>
              )}
              {(hasMetadata || (shardType && Object.keys(shardType.schema?.properties || {}).length > 0)) && (
                <TabsTrigger value="fields">
                  {shardType?.displayName || t('shards:detail.metadata' as any)} Fields
                </TabsTrigger>
              )}
              {hasUnstructuredData && (
                <TabsTrigger value="json">{t('shards:detail.jsonData' as any)}</TabsTrigger>
              )}
              {hasAttachments && (
                <TabsTrigger value="attachments">
                  {t('shards:detail.attachments' as any)} ({shard.attachments?.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Risk Analysis Tab (for opportunities) */}
            {isOpportunity && (
              <TabsContent value="risk" className="mt-4">
                <RiskOverview opportunityId={id} />
              </TabsContent>
            )}

            {/* Content Tab */}
            {hasContent && (
              <TabsContent value="content" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                        {shard.content}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Schema Fields Tab */}
            {(hasMetadata || (shardType && Object.keys(shardType.schema?.properties || {}).length > 0)) && (
              <TabsContent value="fields" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {shardType?.displayName || shardType?.name || t('shards:detail.metadata' as any)}
                    </CardTitle>
                    {shardType?.description && (
                      <CardDescription>{shardType.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {typeLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : shardType ? (
                      <DynamicShardForm
                        shardType={shardType}
                        initialData={shard.metadata || {}}
                        onSubmit={async () => {}}
                        mode="view"
                        readOnly
                        columns={2}
                      />
                    ) : hasMetadata ? (
                      <div className="space-y-3">
                        {Object.entries(shard.metadata!).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b last:border-0"
                          >
                            <span className="font-medium text-sm capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {t('shards:detail.noMetadata' as any)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* JSON Data Tab */}
            {hasUnstructuredData && (
              <TabsContent value="json" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('shards:detail.jsonData' as any)}</CardTitle>
                    <CardDescription>
                      Additional unstructured data stored with this shard
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JsonViewer data={shard.unstructuredData!} title="" height="400px" />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Attachments Tab */}
            {hasAttachments && (
              <TabsContent value="attachments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('shards:detail.attachments' as any)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {shard.attachments!.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{attachment.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.mimeType} • {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={attachment.url} download={attachment.filename}>
                                <Download className="h-4 w-4 mr-2" />
                                {t('shards:detail.download' as any)}
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Relationships Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t('shards:detail.relationships' as any)}
              </CardTitle>
              <CardDescription>
                Connections to other shards in your knowledge graph
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic text-center py-8">
                {t('shards:detail.noRelationships' as any)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Embedding Status Panel */}
          <EmbeddingStatusPanel shardId={id} />

          {/* AI Insights Panel */}
          <QuickInsightPanel
            shardId={id}
            shardName={shard.name}
            onStartConversation={(question) => router.push(`/chat/new?q=${encodeURIComponent(question)}`)}
          />

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('shards:detail.details' as any)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('shards:detail.type' as any)}
                </p>
                <Badge variant="outline" className="font-normal">
                  {shardType?.displayName || shardType?.name || shard.shardTypeId}
                </Badge>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('shards:detail.created' as any)}</p>
                    <p className="text-sm">{format(new Date(shard.createdAt), "PPpp")}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(shard.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('shards:detail.updated' as any)}</p>
                    <p className="text-sm">{format(new Date(shard.updatedAt), "PPpp")}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(shard.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Created By */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('shards:detail.createdBy' as any)}</p>
                    <p className="text-sm">{shard.createdBy}</p>
                  </div>
                </div>

                {shard.updatedBy && shard.updatedBy !== shard.createdBy && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{t('shards:detail.updatedBy' as any)}</p>
                      <p className="text-sm">{shard.updatedBy}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('shards:detail.history' as any)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Version history coming soon
              </p>
            </CardContent>
          </Card>

          {/* ID Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('shards:detail.shardId' as any)}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono truncate">
                    {shard.id}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopyId} className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton
function ShardDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[150px] w-full" />
        </div>
      </div>
    </div>
  )
}
