'use client';

/**
 * Proactive Triggers Management Page
 * Allows users to view, create, edit, and delete proactive triggers
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  ArrowLeft,
  Download,
  Loader2,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useProactiveTriggers,
  useDeleteProactiveTrigger,
  useUpdateProactiveTrigger,
  useSeedDefaultTriggers,
} from '@/hooks/use-proactive-triggers';
import type { ProactiveTrigger } from '@/lib/api/proactive-triggers';
import { useCheckTriggers } from '@/hooks/use-proactive-insights';
import { useShardTypes } from '@/hooks/use-shard-types';
import { toast } from 'sonner';
import { ProactiveTriggerEditor } from '@/components/proactive-triggers/trigger-editor';

type View = 'list' | 'create' | 'edit';

export default function ProactiveTriggersPage() {
  const [view, setView] = useState<View>('list');
  const [selectedTrigger, setSelectedTrigger] = useState<ProactiveTrigger | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [triggerToDelete, setTriggerToDelete] = useState<ProactiveTrigger | null>(null);

  const { data, isLoading, error } = useProactiveTriggers({
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });

  const deleteMutation = useDeleteProactiveTrigger();
  const updateMutation = useUpdateProactiveTrigger();
  const seedMutation = useSeedDefaultTriggers();
  const checkTriggersMutation = useCheckTriggers();

  const handleCreate = () => {
    setSelectedTrigger(undefined);
    setView('create');
  };

  const handleEdit = (trigger: ProactiveTrigger) => {
    setSelectedTrigger(trigger);
    setView('edit');
  };

  const handleBack = () => {
    setView('list');
    setSelectedTrigger(undefined);
  };

  const handleSaved = () => {
    setView('list');
    setSelectedTrigger(undefined);
  };

  const handleDeleteClick = (trigger: ProactiveTrigger) => {
    if (trigger.isSystem) {
      toast.error('Cannot delete system triggers');
      return;
    }
    setTriggerToDelete(trigger);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (triggerToDelete) {
      deleteMutation.mutate(triggerToDelete.id);
      setDeleteDialogOpen(false);
      setTriggerToDelete(null);
    }
  };

  const handleToggleActive = (trigger: ProactiveTrigger) => {
    updateMutation.mutate({
      triggerId: trigger.id,
      data: { isActive: !trigger.isActive },
    });
  };

  // Filter triggers
  const filteredTriggers = data?.triggers.filter((trigger) => {
    if (searchQuery && !trigger.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && trigger.type !== typeFilter) {
      return false;
    }
    return true;
  }) || [];

  const getTypeLabel = (type: ProactiveTrigger['type']) => {
    const labels: Record<ProactiveTrigger['type'], string> = {
      deal_at_risk: 'Deal at Risk',
      milestone_approaching: 'Milestone Approaching',
      stale_opportunity: 'Stale Opportunity',
      missing_follow_up: 'Missing Follow-up',
      relationship_cooling: 'Relationship Cooling',
      action_required: 'Action Required',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: ProactiveTrigger['priority']) => {
    const colors: Record<ProactiveTrigger['priority'], string> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    };
    return colors[priority] || 'default';
  };

  if (view === 'create' || view === 'edit') {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {view === 'create' ? 'Create Trigger' : 'Edit Trigger'}
            </h1>
            <p className="text-muted-foreground">
              {view === 'create'
                ? 'Create a new proactive trigger to automatically generate insights'
                : 'Edit the proactive trigger configuration'}
            </p>
          </div>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </div>

        <ProactiveTriggerEditor
          trigger={selectedTrigger}
          onCancel={handleBack}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Proactive Triggers</h1>
          <p className="text-muted-foreground">
            Manage triggers that automatically generate proactive insights based on conditions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Seed Default Triggers
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Trigger
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Triggers</CardTitle>
          <CardDescription>
            Configure triggers to automatically detect conditions and generate insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search triggers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deal_at_risk">Deal at Risk</SelectItem>
                <SelectItem value="milestone_approaching">Milestone Approaching</SelectItem>
                <SelectItem value="stale_opportunity">Stale Opportunity</SelectItem>
                <SelectItem value="missing_follow_up">Missing Follow-up</SelectItem>
                <SelectItem value="relationship_cooling">Relationship Cooling</SelectItem>
                <SelectItem value="action_required">Action Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load triggers: {(error as Error).message}
            </div>
          ) : filteredTriggers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No triggers match your filters'
                : 'No triggers found. Create your first trigger to get started.'}
            </div>
          ) : (
            <div className="border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Shard Type</th>
                    <th className="text-left p-4 font-medium">Priority</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Triggered</th>
                    <th className="text-left p-4 font-medium">Last Triggered</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTriggers.map((trigger) => (
                    <tr key={trigger.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="font-medium">{trigger.name}</div>
                        {trigger.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {trigger.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{getTypeLabel(trigger.type)}</Badge>
                      </td>
                      <td className="p-4">
                        <code className="text-sm">{trigger.shardTypeId}</code>
                      </td>
                      <td className="p-4">
                        <Badge variant={getPriorityColor(trigger.priority) as any}>
                          {trigger.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={trigger.isActive}
                            onCheckedChange={() => handleToggleActive(trigger)}
                            disabled={updateMutation.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {trigger.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{trigger.triggerCount}</div>
                      </td>
                      <td className="p-4">
                        {trigger.lastTriggeredAt ? (
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(trigger.lastTriggeredAt), {
                              addSuffix: true,
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  checkTriggersMutation.mutate({
                                    triggerIds: [trigger.id],
                                    generateAIContent: true,
                                  })
                                }
                                disabled={checkTriggersMutation.isPending || !trigger.isActive}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Test Trigger
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(trigger)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {!trigger.isSystem && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(trigger)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trigger</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{triggerToDelete?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

