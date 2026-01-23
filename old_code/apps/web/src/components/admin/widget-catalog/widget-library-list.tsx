/**
 * Widget Library List Component
 * SuperAdmin view for managing widget catalog entries
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWidgetCatalogEntries, useDeleteWidgetCatalogEntry } from '@/hooks/use-widget-catalog';
import { WidgetCatalogStatus } from '@/types/widget-catalog';
import { MoreHorizontal, Plus, Search, Trash2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export function WidgetCatalogListView() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('');

  const { data, isLoading, error } = useWidgetCatalogEntries({
    page,
    limit: 20,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    category: category || undefined,
    sort: 'name',
  });

  const deleteMutation = useDeleteWidgetCatalogEntry();

  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this widget type? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(entryId);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to delete widget', 3, {
          errorMessage: errorObj.message,
          entryId,
        })
      }
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load widget catalog: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-2">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
        </div>

        <Select value={status} onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={WidgetCatalogStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={WidgetCatalogStatus.INACTIVE}>Inactive</SelectItem>
            <SelectItem value={WidgetCatalogStatus.DEPRECATED}>Deprecated</SelectItem>
            <SelectItem value={WidgetCatalogStatus.HIDDEN}>Hidden</SelectItem>
          </SelectContent>
        </Select>

        <Link href="/admin/widgets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Widget
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading widgets...
                </TableCell>
              </TableRow>
            ) : !data?.items || data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No widgets found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((widget) => (
                <TableRow key={widget.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{widget.displayName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {widget.widgetType}
                  </TableCell>
                  <TableCell className="text-sm">{widget.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        widget.status === WidgetCatalogStatus.ACTIVE ? 'default' : 'secondary'
                      }
                      className="capitalize"
                    >
                      {widget.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {widget.isDefault ? (
                      <Badge variant="outline" className="bg-blue-50">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {widget.isFeatured ? (
                      <Badge variant="outline" className="bg-yellow-50">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/widgets/${widget.id}`} className="flex gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(widget.id)}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.total} widgets
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!data || data.items.length < 20 || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
