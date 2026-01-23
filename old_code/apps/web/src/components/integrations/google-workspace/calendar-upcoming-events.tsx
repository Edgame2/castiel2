'use client';

import { useCalendarEvents } from '@/hooks/use-google-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, RefreshCw, Loader2, MapPin, Users } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import Link from 'next/link';

interface CalendarUpcomingEventsProps {
  integrationId: string;
  limit?: number;
  days?: number;
}

export function CalendarUpcomingEvents({
  integrationId,
  limit = 5,
  days = 7,
}: CalendarUpcomingEventsProps) {
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + days);

  const { data, isLoading, error, refetch, isRefetching } = useCalendarEvents(integrationId, {
    timeMin,
    timeMax,
    limit,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
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
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load calendar events
          </div>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events || [];

  const formatEventTime = (event: {
    start?: { dateTime?: string; date?: string; timeZone?: string };
  }) => {
    if (!event.start) return '';
    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : null;

    if (!startDate) return '';

    if (isToday(startDate)) {
      return `Today at ${format(startDate, 'h:mm a')}`;
    }
    if (isTomorrow(startDate)) {
      return `Tomorrow at ${format(startDate, 'h:mm a')}`;
    }
    return format(startDate, 'MMM d, h:mm a');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Upcoming Events</CardTitle>
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {events.length}
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
          Events in the next {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No upcoming events
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const startDate = event.start?.dateTime
                ? new Date(event.start.dateTime)
                : event.start?.date
                  ? new Date(event.start.date)
                  : null;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatEventTime(event)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold mb-1">
                      {event.summary || '(No title)'}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  {event.hangoutLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link
                        href={event.hangoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Calendar
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







