'use client';

/**
 * ActivityFeed Component
 * Displays activity feed for collaborative insights (shares, comments, reactions, mentions)
 */

import { useActivityFeed } from '@/hooks/use-collaborative-insights';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Heart, AtSign, Share2, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/lib/api/collaborative-insights';
import Link from 'next/link';

interface ActivityFeedProps {
  className?: string;
  limit?: number;
}

export function ActivityFeed({ className, limit = 20 }: ActivityFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useActivityFeed(limit);

  const activities = data?.pages.flatMap((page) => page.items) || [];

  const getActivityIcon = (type: ActivityFeedItem['type']) => {
    switch (type) {
      case 'share':
        return <Share2 className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'reaction':
        return <Heart className="h-4 w-4" />;
      case 'mention':
        return <AtSign className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityFeedItem['type']) => {
    switch (type) {
      case 'share':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'comment':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'reaction':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      case 'mention':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getActivityLabel = (type: ActivityFeedItem['type']) => {
    switch (type) {
      case 'share':
        return 'shared';
      case 'comment':
        return 'commented on';
      case 'reaction':
        return 'reacted to';
      case 'mention':
        return 'mentioned you in';
      default:
        return 'updated';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        No activity yet. Share an insight to get started!
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {activities.map((activity) => {
            const userInitials = activity.actor.name
              .split(' ' as any)
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || activity.actor.id.substring(0, 2).toUpperCase();

            return (
              <Link
                key={activity.id}
                href={`/insights/${activity.insight.id}`}
                className="block p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{activity.actor.name}</span>
                      <Badge variant="outline" className={cn('text-xs', getActivityColor(activity.type))}>
                        <span className="mr-1">{getActivityIcon(activity.type)}</span>
                        {getActivityLabel(activity.type)}
                      </Badge>
                    </div>

                    <h4 className="font-semibold text-sm truncate">{activity.insight.title}</h4>

                    {activity.preview && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{activity.preview}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}










