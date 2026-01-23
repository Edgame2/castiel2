'use client'

/**
 * Context Templates Admin Page
 * Super Admin page for viewing and managing AI context templates
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextTemplates } from '@/hooks/use-insights'
import { FileText, Search, Filter, Eye } from 'lucide-react'
import Link from 'next/link'

export default function ContextTemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useContextTemplates({
    category: categoryFilter || undefined,
    includeSystem: true,
  })

  const templates = data?.templates || []

  // Filter templates by search query (client-side)
  const filteredTemplates = searchQuery
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : templates

  const categoryColors: Record<string, string> = {
    summary: 'bg-blue-100 text-blue-800',
    analysis: 'bg-purple-100 text-purple-800',
    comparison: 'bg-green-100 text-green-800',
    extraction: 'bg-orange-100 text-orange-800',
    generation: 'bg-pink-100 text-pink-800',
    custom: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Context Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage AI context templates used for insight generation
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
                <SelectItem value="extraction">Extraction</SelectItem>
                <SelectItem value="generation">Generation</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
          <CardDescription>
            Context templates define how AI insights gather and structure context from shards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load templates</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm mt-2">
                {searchQuery || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'No context templates have been created yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Applicable Shard Types</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={categoryColors[template.category] || categoryColors.custom}
                      >
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.scope}</Badge>
                    </TableCell>
                    <TableCell>
                      {template.applicableShardTypes && template.applicableShardTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {template.applicableShardTypes.slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                          {template.applicableShardTypes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.applicableShardTypes.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">All types</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.isActive !== false ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/ai-settings/context-templates/${template.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

