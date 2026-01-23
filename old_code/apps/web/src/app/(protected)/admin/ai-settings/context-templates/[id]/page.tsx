'use client'

/**
 * Context Template Detail Page
 * View detailed information about a specific context template
 */

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextTemplate } from '@/hooks/use-insights'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ContextTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: template, isLoading, error } = useContextTemplate(id)

  const categoryColors: Record<string, string> = {
    summary: 'bg-blue-100 text-blue-800',
    analysis: 'bg-purple-100 text-purple-800',
    comparison: 'bg-green-100 text-green-800',
    extraction: 'bg-orange-100 text-orange-800',
    generation: 'bg-pink-100 text-pink-800',
    custom: 'bg-gray-100 text-gray-800',
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai-settings/context-templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load template</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Template not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai-settings/context-templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              {template.name}
            </h1>
            {template.description && (
              <p className="text-muted-foreground mt-2">{template.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Category</div>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={categoryColors[template.category] || categoryColors.custom}
                >
                  {template.category}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Scope</div>
              <div className="mt-1">
                <Badge variant="outline">{template.scope}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="mt-1">
                {template.isActive !== false ? (
                  <Badge variant="default" className="bg-green-600">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            {template.isDefault && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Type</div>
                <div className="mt-1">
                  <Badge variant="outline">Default Template</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applicable Shard Types */}
        <Card>
          <CardHeader>
            <CardTitle>Applicable Shard Types</CardTitle>
            <CardDescription>
              Shard types this template can be used with
            </CardDescription>
          </CardHeader>
          <CardContent>
            {template.applicableShardTypes && template.applicableShardTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.applicableShardTypes.map((type) => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All shard types</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Template Configuration</CardTitle>
          <CardDescription>
            Detailed configuration for this context template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(template, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

