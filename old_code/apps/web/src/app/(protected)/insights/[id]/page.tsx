'use client';

/**
 * Shared Insight Detail Page
 * Displays a single shared insight with comments, reactions, and engagement
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Share2,
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
  Sparkles,
  Pin,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInsight } from '@/hooks/use-collaborative-insights';
import { ReactionPicker, CommentThread } from '@/components/collaborative-insights';
import { cn } from '@/lib/utils';
import type { InsightVisibility } from '@/lib/api/collaborative-insights';

interface InsightDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InsightDetailPage({ params }: InsightDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: insight, isLoading, error } = useInsight(id);

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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-6">
        <Sparkles className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Insight not found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : 'The insight you are looking for does not exist or you do not have access to it.'}
        </p>
        <Button onClick={() => router.push('/insights')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Insights
        </Button>
      </div>
    );
  }

  const VisibilityIcon = getVisibilityIcon(insight.visibility);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/insights')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{insight.title}</h1>
              {insight.isPinned && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              {insight.isArchived && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Archive className="h-3 w-3" />
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Shared by {insight.sharedBy}</span>
              </div>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(insight.sharedAt), { addSuffix: true })}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <VisibilityIcon className="h-4 w-4" />
                <span>{getVisibilityLabel(insight.visibility)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Loader2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pin className="h-4 w-4 mr-2" />
                {insight.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                {insight.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Archive className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          {insight.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{insight.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{insight.content}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {insight.tags && insight.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insight.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({insight.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread insightId={insight.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Engagement Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-semibold">{insight.views}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Reactions</span>
                </div>
                <span className="font-semibold">{insight.reactions.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Comments</span>
                </div>
                <span className="font-semibold">{insight.comments.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Reactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactionPicker insightId={insight.id} reactions={insight.reactions} />
            </CardContent>
          </Card>

          {/* Shared With */}
          {insight.sharedWith && insight.sharedWith.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shared With
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insight.sharedWith.map((target, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{target.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {target.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Shards */}
          {insight.relatedShardIds && insight.relatedShardIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Shards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insight.relatedShardIds.map((shardId) => (
                    <Button
                      key={shardId}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => router.push(`/shards/${shardId}`)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {shardId.substring(0, 8)}...
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Type</span>
                <Badge variant="outline">{insight.sourceType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDistanceToNow(new Date(insight.sharedAt), { addSuffix: true })}</span>
              </div>
              {insight.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span>{formatDistanceToNow(new Date(insight.expiresAt), { addSuffix: true })}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}










