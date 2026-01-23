'use client';

import { useGmailInbox } from '@/hooks/use-google-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface GmailInboxPreviewProps {
  integrationId: string;
  limit?: number;
}

export function GmailInboxPreview({ integrationId, limit = 5 }: GmailInboxPreviewProps) {
  const { data, isLoading, error, refetch, isRefetching } = useGmailInbox(integrationId, {
    limit,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load Gmail inbox
          </div>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = data?.unreadCount || 0;
  const messages = data?.recentMessages || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Gmail Inbox</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Recent unread messages from your Gmail account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No unread messages
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {message.from}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1 truncate">
                    {message.subject || '(No subject)'}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {message.snippet}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <Link
                    href={`https://mail.google.com/mail/u/0/#inbox/${message.threadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Gmail
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







