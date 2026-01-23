"use client"

import Link from 'next/link'
import { useEmbeddingTemplatesList } from '@/hooks/use-embedding-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, ListChecks } from 'lucide-react'

export default function EmbeddingTemplatesListPage() {
  const { data, isLoading, isError } = useEmbeddingTemplatesList()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-8 w-8" />
            Embedding Templates
          </h2>
          <p className="text-muted-foreground">Manage custom embedding templates per Shard Type</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shard Types with Custom Templates</CardTitle>
          <CardDescription>
            These shard types have tenant-specific embedding templates defined. Click Edit to view or modify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ) : isError ? (
            <div className="text-sm text-red-600">Failed to load embedding templates.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No custom templates found. Use the Edit page on a Shard Type to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items || []).map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-medium">{st.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{st.id}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/admin/ai-settings/embedding-templates/${st.id}`}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
