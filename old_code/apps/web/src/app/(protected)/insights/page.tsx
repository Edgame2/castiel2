'use client';

/**
 * Shared Insights List Page
 * Displays all shared insights visible to the user with filtering and search
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Sparkles,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Heart,
  Tag,
  Users,
  Lock,
  Globe,
  Building2,
  User,
  Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useInsights } from '@/hooks/use-collaborative-insights';
import type { InsightVisibility } from '@/lib/api/collaborative-insights';
import { cn } from '@/lib/utils';

const VISIBILITY_OPTIONS: { value: InsightVisibility | 'all'; label: string; icon: typeof Lock }[] = [
  { value: 'all', label: 'All', icon: Globe },
  { value: 'tenant', label: 'Tenant', icon: Building2 },
  { value: 'department', label: 'Department', icon: Users },
  { value: 'team', label: 'Team', icon: Users },
  { value: 'private', label: 'Private', icon: Lock },
];

export default function InsightsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<InsightVisibility | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const { data, isLoading, error } = useInsights({
    visibility: visibility === 'all' ? undefined : visibility,
    tags: selectedTag || undefined,
    limit: 50,
    offset: 0,
  });

  const insights = data?.insights || [];
  const allTags = Array.from(
    new Set(insights.flatMap((insight) => insight.tags || []))
  ).sort();

  const filteredInsights = insights.filter((insight) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      insight.title.toLowerCase().includes(searchLower) ||
      insight.content.toLowerCase().includes(searchLower) ||
      (insight.summary && insight.summary.toLowerCase().includes(searchLower))
    );
  });

  const getVisibilityIcon = (vis: InsightVisibility) => {
    switch (vis) {
      case 'tenant':
        return Building2;
      case 'department':
        return Users;
      case 'team':
        return Users;
      case 'private':
        return Lock;
      default:
        return Globe;
    }
  };

  const getVisibilityLabel = (vis: InsightVisibility) => {
    switch (vis) {
      case 'tenant':
        return 'Tenant';
      case 'department':
        return 'Department';
      case 'team':
        return 'Team';
      case 'private':
        return 'Private';
      default:
        return 'Public';
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-6">
        <Sparkles className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Error loading insights</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : 'Failed to load shared insights'}
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
            <Sparkles className="h-8 w-8" />
            Shared Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover and collaborate on insights shared by your team
          </p>
        </div>
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Visibility Filter */}
            <Select value={visibility} onValueChange={(value) => setVisibility(value as InsightVisibility | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No insights found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {search || visibility !== 'all' || selectedTag
                ? 'Try adjusting your filters to see more insights.'
                : 'No insights have been shared yet. Share an insight to get started!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInsights.map((insight) => {
            const VisibilityIcon = getVisibilityIcon(insight.visibility);
            return (
              <Card
                key={insight.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/insights/${insight.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{insight.title}</CardTitle>
                    <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                      <VisibilityIcon className="h-3 w-3" />
                      {getVisibilityLabel(insight.visibility)}
                    </Badge>
                  </div>
                  {insight.summary && (
                    <CardDescription className="line-clamp-2">{insight.summary}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {insight.content}
                  </p>

                  {/* Tags */}
                  {insight.tags && insight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {insight.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {insight.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{insight.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{insight.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{insight.reactions.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{insight.comments.length}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {insight.sharedBy}</span>
                    <span>{formatDistanceToNow(new Date(insight.sharedAt), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}










