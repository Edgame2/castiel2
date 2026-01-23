"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    ShardTypeIcon,
    ShardTypeCard,
    SchemaInheritanceTree,
} from "@/components/shard-types"
import {
    ArrowLeft,
    Pencil,
    FileText,
    Copy,
    Trash2,
    Globe,
    Calendar,
    User,
    Tag,
    FolderTree,
    FileCode,
    Activity,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useShardType } from "@/hooks/use-shard-types"
import { useDeleteShardType, useCloneShardType } from "@/hooks/use-shard-type-mutations"

export default function ShardTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useTranslation('common')
    const { id } = use(params)
    const router = useRouter()
    const [activeTab, setActiveTab] = React.useState("overview")

    const { data: shardType, isLoading } = useShardType(id)
    const deleteMutation = useDeleteShardType()
    const cloneMutation = useCloneShardType()

    const handleDelete = () => {
        if (window.confirm(t('shardTypes.detail.deleteConfirm', 'Are you sure you want to delete this shard type?'))) {
            deleteMutation.mutate(id, {
                onSuccess: () => router.push('/shard-types')
            })
        }
    }

    const handleClone = () => {
        cloneMutation.mutate(id, {
            onSuccess: (newShardType) => router.push(`/shard-types/${newShardType.id}/edit`)
        })
    }

    if (isLoading) {
        return <LoadingSkeleton />
    }

    if (!shardType) {
        return (
            <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t('shardTypes.detail.notFound', 'Shard Type Not Found')}</CardTitle>
                        <CardDescription>
                            {t('shardTypes.detail.notFoundDesc', "The shard type you're looking for doesn't exist or you don't have permission to view it.")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/shard-types")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('shardTypes.detail.backToList', 'Back to Shard Types')}
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
                            onClick={() => router.push("/shard-types")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('back' as any)}
                        </Button>
                        <div className="flex items-center gap-3">
                            <ShardTypeIcon
                                icon={shardType.icon}
                                color={shardType.color}
                                size="lg"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight">
                                        {shardType.displayName}
                                    </h1>
                                    {shardType.isGlobal && (
                                        <Badge variant="outline" className="gap-1">
                                            <Globe className="h-3 w-3" />
                                            {t('shardTypes.detail.global', 'Global')}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant={
                                            shardType.status === "active"
                                                ? "default"
                                                : shardType.status === "deprecated"
                                                    ? "secondary"
                                                    : "destructive"
                                        }
                                    >
                                        {String(shardType.status).charAt(0).toUpperCase() +
                                            String(shardType.status).slice(1)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {shardType.description || shardType.name}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/shard-types/${id}/preview`)}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('shardTypes.detail.previewForm', 'Preview Form')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClone}
                            disabled={cloneMutation.isPending}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            {cloneMutation.isPending ? t('shardTypes.detail.cloning', 'Cloning...') : t('shardTypes.detail.clone', 'Clone')}
                        </Button>
                        <Button onClick={() => router.push(`/shard-types/${id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('edit' as any)}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleteMutation.isPending ? t('shardTypes.detail.deleting', 'Deleting...') : t('delete' as any)}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview" className="gap-2">
                            <Activity className="h-4 w-4" />
                            {t('shardTypes.detail.tabs.overview', 'Overview')}
                        </TabsTrigger>
                        <TabsTrigger value="schema" className="gap-2">
                            <FileCode className="h-4 w-4" />
                            {t('shardTypes.detail.tabs.schema', 'Schema')}
                        </TabsTrigger>
                        <TabsTrigger value="usage" className="gap-2">
                            <FolderTree className="h-4 w-4" />
                            {t('shardTypes.detail.tabs.usage', 'Usage')}
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Metadata Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('shardTypes.detail.metadata', 'Metadata')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{t('shardTypes.detail.created', 'Created')}</p>
                                            <p className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(shardType.createdAt), {
                                                    addSuffix: true,
                                                })}
                                                {shardType.createdBy && ` ${t('shardTypes.detail.by', 'by')} ${shardType.createdBy}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{t('shardTypes.detail.lastUpdated', 'Last Updated')}</p>
                                            <p className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(shardType.updatedAt), {
                                                    addSuffix: true,
                                                })}
                                                {shardType.updatedBy && ` ${t('shardTypes.detail.by', 'by')} ${shardType.updatedBy}`}
                                            </p>
                                        </div>
                                    </div>
                                    {shardType.tags && shardType.tags.length > 0 && (
                                        <div className="flex items-start gap-3 text-sm">
                                            <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                                            <div className="flex-1">
                                                <p className="font-medium mb-2">{t('shardTypes.detail.tags', 'Tags')}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {shardType.tags.map((tag: string) => (
                                                        <Badge key={tag} variant="secondary">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Category Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('shardTypes.detail.categoryProperties', 'Category & Properties')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium mb-1">{t('shardTypes.form.category', 'Category')}</p>
                                        <Badge variant="outline">
                                            {shardType.category.replace(/_/g, ' ').charAt(0).toUpperCase() +
                                                shardType.category.replace(/_/g, ' ').slice(1).toLowerCase()}
                                        </Badge>
                                    </div>
                                    <Separator />
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('shardTypes.detail.systemIdentifier', 'System Identifier')}</span>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {shardType.name}
                                            </code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('shardTypes.detail.systemType', 'System Type')}</span>
                                            <span>{shardType.isSystem ? t('yes' as any) : t('no' as any)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('shardTypes.detail.customType', 'Custom Type')}</span>
                                            <span>{shardType.isCustom ? t('yes' as any) : t('no' as any)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('shardTypes.detail.builtInType', 'Built-in Type')}</span>
                                            <span>{shardType.isBuiltIn ? t('yes' as any) : t('no' as any)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Inheritance Card */}
                        {shardType.parentShardTypeId && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('shardTypes.detail.schemaInheritance', 'Schema Inheritance')}</CardTitle>
                                    <CardDescription>
                                        {t('shardTypes.detail.schemaInheritanceDesc', 'This shard type inherits schema fields from its parent')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SchemaInheritanceTree
                                        shardTypeId={shardType.id}
                                        shardTypes={[shardType]}
                                        onNavigate={(id) => router.push(`/shard-types/${id}`)}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Description Card */}
                        {shardType.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('description' as any)}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {shardType.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Schema Tab */}
                    <TabsContent value="schema" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('shardTypes.detail.jsonSchema', 'JSON Schema')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.detail.jsonSchemaDesc', 'The schema definition for this shard type')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                                    {JSON.stringify(shardType.schema, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>

                        {shardType.uiSchema && Object.keys(shardType.uiSchema).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('shardTypes.detail.uiSchema', 'UI Schema')}</CardTitle>
                                    <CardDescription>
                                        {t('shardTypes.detail.uiSchemaDesc', 'Custom UI configuration for form rendering')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                                        {JSON.stringify(shardType.uiSchema, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Usage Tab */}
                    <TabsContent value="usage" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('shardTypes.detail.usageStats', 'Usage Statistics')}</CardTitle>
                                <CardDescription>
                                    {t('shardTypes.detail.usageStatsDesc', 'See how this shard type is being used')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        {t('shardTypes.detail.usageComingSoon', 'Usage statistics will be displayed here')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="flex h-full flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <Skeleton className="h-[600px] w-full" />
        </div>
    )
}
