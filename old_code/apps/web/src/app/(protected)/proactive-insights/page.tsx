'use client';

/**
 * Proactive Insights List Page
 * Displays all proactive insights with filtering and actions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  TrendingDown,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  MoreVertical,
  Eye,
  BarChart3,
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
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProactiveInsights,
  useAcknowledgeProactiveInsight,
  useDismissProactiveInsight,
  useActionProactiveInsight,
} from '@/hooks/use-proactive-insights';
import type {
  ProactiveInsightStatus,
  ProactiveInsightType,
  ProactiveInsightPriority,
} from '@/lib/api/proactive-insights';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: ProactiveInsightStatus | 'all'; label: string; icon: typeof Clock }[] = [
  { value: 'all', label: 'All Status', icon: Clock },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'delivered', label: 'Delivered', icon: Bell },
  { value: 'acknowledged', label: 'Acknowledged', icon: CheckCircle2 },
  { value: 'actioned', label: 'Actioned', icon: CheckCircle },
  { value: 'dismissed', label: 'Dismissed', icon: XCircle },
  { value: 'expired', label: 'Expired', icon: AlertCircle },
];

const TYPE_OPTIONS: { value: ProactiveInsightType | 'all'; label: string; icon: typeof AlertTriangle }[] = [
  { value: 'all', label: 'All Types', icon: AlertTriangle },
  { value: 'deal_at_risk', label: 'Deal at Risk', icon: TrendingDown },
  { value: 'milestone_approaching', label: 'Milestone Approaching', icon: Calendar },
  { value: 'stale_opportunity', label: 'Stale Opportunity', icon: Clock },
  { value: 'missing_follow_up', label: 'Missing Follow-up', icon: Target },
  { value: 'relationship_cooling', label: 'Relationship Cooling', icon: TrendingDown },
  { value: 'action_required', label: 'Action Required', icon: AlertTriangle },
];

const PRIORITY_OPTIONS: { value: ProactiveInsightPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function getPriorityColor(priority: ProactiveInsightPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusColor(status: ProactiveInsightStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'delivered':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'acknowledged':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'actioned':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'dismissed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getTypeLabel(type: ProactiveInsightType): string {
  const option = TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label || type;
}

export default function ProactiveInsightsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProactiveInsightStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProactiveInsightType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ProactiveInsightPriority | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 24; // 24 items per page (3 columns × 8 rows)

  const acknowledgeMutation = useAcknowledgeProactiveInsight();
  const dismissMutation = useDismissProactiveInsight();
  const actionMutation = useActionProactiveInsight();

  const { data, isLoading, error } = useProactiveInsights({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    limit,
    offset: (page - 1) * limit,
    orderBy: 'createdAt',
    order: 'desc',
  });

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilter: any, setter: (value: any) => void) => {
    setter(newFilter);
    setPage(1);
  };

  const insights = data?.insights || [];

  const filteredInsights = insights.filter((insight) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      insight.title.toLowerCase().includes(searchLower) ||
      insight.message.toLowerCase().includes(searchLower) ||
      (insight.recommendation && insight.recommendation.toLowerCase().includes(searchLower)) ||
      (insight.shardName && insight.shardName.toLowerCase().includes(searchLower))
    );
  });

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentStart = data ? (page - 1) * limit + 1 : 0;
  const currentEnd = data ? Math.min(page * limit, data.total) : 0;

  const handleAcknowledge = (insightId: string) => {
    acknowledgeMutation.mutate(insightId);
  };

  const handleDismiss = (insightId: string) => {
    dismissMutation.mutate({ insightId });
  };

  const handleAction = (insightId: string) => {
    actionMutation.mutate(insightId);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-6">
        <Bell className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Error loading insights</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : 'Failed to load proactive insights'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Proactive Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated insights that alert you to important conditions and opportunities
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/proactive-insights/analytics')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search insights..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(v, setStatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(v, setTypeFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={(v) => handleFilterChange(v, setPriorityFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No proactive insights</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {search || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                ? 'No insights match your filters. Try adjusting your search criteria.'
                : 'You don\'t have any proactive insights yet. Insights will appear here when important conditions are detected.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInsights.map((insight) => (
            <Card
              key={insight.id}
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                insight.priority === 'critical' && 'border-red-300',
                insight.priority === 'high' && 'border-orange-300'
              )}
              onClick={() => router.push(`/proactive-insights/${insight.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{insight.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn('text-xs', getPriorityColor(insight.priority))}>
                        {insight.priority}
                      </Badge>
                      <Badge className={cn('text-xs', getStatusColor(insight.status))}>
                        {insight.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(insight.type)}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {insight.status === 'delivered' || insight.status === 'pending' ? (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(insight.id);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Acknowledge
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(insight.id);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Actioned
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(insight.id);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Dismiss
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/proactive-insights/${insight.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {insight.message}
                </p>

                {insight.recommendation && (
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Recommendation:</p>
                    <p className="text-sm text-muted-foreground">{insight.recommendation}</p>
                  </div>
                )}

                {insight.shardName && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Related to:</p>
                    <Badge variant="outline" className="text-xs">
                      {insight.shardName}
                    </Badge>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}</span>
                  {insight.acknowledgedAt && (
                    <span className="text-green-600">Acknowledged</span>
                  )}
                  {insight.actionedAt && (
                    <span className="text-emerald-600">Actioned</span>
                  )}
                  {insight.dismissedAt && (
                    <span className="text-gray-600">Dismissed</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {currentStart} - {currentEnd} of {data.total} insights
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading || !data.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

