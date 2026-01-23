/**
 * Risk Catalog Management Page
 * Manage risk catalog entries (view, create, edit, delete)
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, MoreVertical, Edit, Trash2, AlertCircle, Shield, ShieldOff } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { useRiskCatalog, useDeleteRisk } from '@/hooks/use-risk-analysis';
import { RiskCatalogFormDialog } from '@/components/risk-analysis/risk-catalog-form-dialog';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { RiskCatalog } from '@/types/risk-analysis';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export default function RiskCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskCatalog | null>(null);

  // Check permissions
  const canReadTeamRisks = usePermissionCheck('risk:read:team');
  const canReadTenantRisks = usePermissionCheck('risk:read:tenant');
  const canCreateRisks = usePermissionCheck('shard:create:tenant');
  const canUpdateRisks = usePermissionCheck('shard:update:all');
  const canDeleteRisks = usePermissionCheck('shard:delete:all');
  const hasReadAccess = canReadTeamRisks || canReadTenantRisks;

  const { data: catalog = [], isLoading, error, refetch } = useRiskCatalog();
  const deleteMutation = useDeleteRisk();

  // Filter risks
  const filteredRisks = catalog.filter((risk) => {
    const matchesSearch =
      risk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.riskId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || risk.category === categoryFilter;
    const matchesCatalogType = catalogTypeFilter === 'all' || risk.catalogType === catalogTypeFilter;

    return matchesSearch && matchesCategory && matchesCatalogType;
  });

  // Group by category for display
  const risksByCategory = filteredRisks.reduce((acc, risk) => {
    if (!acc[risk.category]) {
      acc[risk.category] = [];
    }
    acc[risk.category].push(risk);
    return acc;
  }, {} as Record<string, RiskCatalog[]>);

  const handleEdit = (risk: RiskCatalog) => {
    // Only allow editing tenant-specific risks
    if (risk.catalogType === 'tenant') {
      setSelectedRisk(risk);
      setEditDialogOpen(true);
    }
  };

  const handleDelete = (risk: RiskCatalog) => {
    // Only allow deleting tenant-specific risks
    if (risk.catalogType === 'tenant') {
      setSelectedRisk(risk);
      setDeleteDialogOpen(true);
    }
  };

  const getCatalogTypeBadge = (type: string) => {
    switch (type) {
      case 'global':
        return <Badge variant="default">Global</Badge>;
      case 'industry':
        return <Badge variant="secondary">Industry</Badge>;
      case 'tenant':
        return <Badge variant="outline">Custom</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Commercial':
        return 'bg-blue-100 text-blue-800';
      case 'Technical':
        return 'bg-purple-100 text-purple-800';
      case 'Legal':
        return 'bg-red-100 text-red-800';
      case 'Financial':
        return 'bg-green-100 text-green-800';
      case 'Competitive':
        return 'bg-orange-100 text-orange-800';
      case 'Operational':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Permission check
  if (!hasReadAccess) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <ShieldOff className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have permission to view the risk catalog. Manager or Director role required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <ErrorDisplay 
              error={error} 
              onRetry={() => refetch()}
              title="Failed to Load Risk Catalog"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Manage risk definitions and detection rules
          </p>
        </div>
        {canCreateRisks && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Risk
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, description, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Financial">Financial</SelectItem>
                  <SelectItem value="Competitive">Competitive</SelectItem>
                  <SelectItem value="Operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={catalogTypeFilter} onValueChange={setCatalogTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="tenant">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Catalog Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : filteredRisks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No risks found.</p>
              <p className="text-sm mt-2">
                {searchQuery || categoryFilter !== 'all' || catalogTypeFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create a custom risk to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Risk Definitions ({filteredRisks.length})</CardTitle>
            <CardDescription>
              {catalog.length} total risks ({catalog.filter(r => r.catalogType === 'tenant').length} custom)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-mono text-sm">{risk.riskId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{risk.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {risk.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(risk.category)}>
                        {risk.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{getCatalogTypeBadge(risk.catalogType)}</TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {(risk.defaultPonderation * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {risk.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {risk.catalogType === 'tenant' && (
                            <>
                              {canUpdateRisks && (
                                <DropdownMenuItem onClick={() => handleEdit(risk)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDeleteRisks && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(risk)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {risk.catalogType !== 'tenant' && (
                            <DropdownMenuItem disabled>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Global/Industry risks cannot be edited
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <RiskCatalogFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />

      {/* Edit Dialog */}
      <RiskCatalogFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        risk={selectedRisk}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the risk &quot;{selectedRisk?.name}&quot;? This action
              cannot be undone. This risk will no longer be detected for opportunities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedRisk) {
                  try {
                    await deleteMutation.mutateAsync(selectedRisk.riskId);
                    setDeleteDialogOpen(false);
                    setSelectedRisk(null);
                  } catch (err) {
                    const errorObj = err instanceof Error ? err : new Error(String(err))
                    trackException(errorObj, 3)
                    trackTrace('Failed to delete risk', 3, {
                      errorMessage: errorObj.message,
                      riskId: selectedRisk?.riskId,
                    })
                  }
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


