/**
 * Integration Catalog List Page
 * Super admin catalog management
 * 
 * Path: apps/web/src/app/admin/integration-catalog/page.tsx
 */

'use client';

import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { useCatalogEntries, useDeleteCatalogEntry, useDeprecateCatalogEntry } from '@/hooks/use-integration-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CatalogListPageProps { }

export default function CatalogListPage({ }: CatalogListPageProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useCatalogEntries({
    limit,
    offset,
    ...(searchTerm && { searchTerm }),
    ...(category && { category }),
    ...(status && { status }),
  });

  const deleteMutation = useDeleteCatalogEntry();
  const deprecateMutation = useDeprecateCatalogEntry();

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    deleteMutation.mutate(integrationId);
  };

  const handleDeprecate = async (integrationId: string) => {
    if (!confirm('Are you sure you want to deprecate this integration?')) return;
    deprecateMutation.mutate(integrationId);
  };

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Catalog</h1>
          <p className="text-muted-foreground">
            Manage integration types and tenant access
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/integration-catalog/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Integration
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search integrations..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setOffset(0);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={category || "all"} onValueChange={(value) => {
              setCategory(value === "all" ? "" : value);
              setOffset(0);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="data_source">Data Source</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="ai_provider">AI Provider</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={status || "all"} onValueChange={(value) => {
              setStatus(value === "all" ? "" : value);
              setOffset(0);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load integrations</p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No integrations found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => router.push(`/admin/integration-catalog/${entry.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: entry.color }}
                        >
                          {entry.icon.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{entry.displayName}</h3>
                          <p className="text-sm text-muted-foreground">{entry.id}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {entry.description}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="outline">{entry.category}</Badge>
                        <Badge
                          variant={entry.status === 'active' ? 'default' : 'secondary'}
                        >
                          {entry.status}
                        </Badge>
                        {entry.audience === 'system' && (
                          <Badge variant="secondary">System Only</Badge>
                        )}
                        {entry.requiredPlan && (
                          <Badge variant="outline">{entry.requiredPlan}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/integration-catalog/${entry.id}`)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/integration-catalog/${entry.id}/visibility`)}
                        >
                          Manage Visibility
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/integration-catalog/${entry.id}/whitelist`)}
                        >
                          Manage Whitelist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/integration-catalog/${entry.id}/shard-mappings`)}
                        >
                          Shard Mappings
                        </DropdownMenuItem>
                        {entry.status !== 'deprecated' && (
                          <>
                            <DropdownMenuItem onClick={() => handleDeprecate(entry.id)}>
                              Deprecate
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(entry.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!hasMore}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
