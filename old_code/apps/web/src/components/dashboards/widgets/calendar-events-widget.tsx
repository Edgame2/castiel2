"use client"

import { Calendar, ExternalLink, RefreshCw, Loader2, MapPin, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns"
import { useCalendarEvents } from "@/hooks/use-google-workspace"
import Link from "next/link"
import { useState } from "react"

interface CalendarEventsWidgetProps {
  widget: Widget
  data: unknown
}

interface CalendarEventsData {
  events: Array<{
    id: string
    summary: string
    description?: string
    start: { dateTime?: string; date?: string; timeZone?: string }
    end: { dateTime?: string; date?: string; timeZone?: string }
    location?: string
    attendees?: Array<{ email: string; responseStatus?: string }>
    organizer?: string
    hangoutLink?: string
  }>
  count: number
}

export function CalendarEventsWidget({ widget, data }: CalendarEventsWidgetProps) {
  const integrationId = (widget.config as any)?.integrationId as string | undefined
  const limit = (widget.config as any)?.limit as number || 10
  const days = (widget.config as any)?.days as number || 7

  const timeMin = new Date()
  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + days)

  const { data: eventsData, isLoading, error, refetch } = useCalendarEvents(
    integrationId || '',
    { timeMin, timeMax, limit }
  )

  // Use provided data or fetched data
  const events = ((data as CalendarEventsData)?.events) || eventsData?.events || []
  const isLoadingData = !data && isLoading
  const hasError = !data && error

  const formatEventTime = (event: {
    start?: { dateTime?: string; date?: string; timeZone?: string }
  }) => {
    if (!event.start) return ''
    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : null

    if (!startDate) return ''

    if (isToday(startDate)) {
      return `Today at ${format(startDate, 'h:mm a')}`
    }
    if (isTomorrow(startDate)) {
      return `Tomorrow at ${format(startDate, 'h:mm a')}`
    }
    return format(startDate, 'MMM d, h:mm a')
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load calendar events</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-4">No upcoming events</p>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-semibold">Upcoming Events</span>
          {events.length > 0 && (
            <Badge variant="secondary">{events.length}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {events.map((event) => {
            const startDate = event.start?.dateTime
              ? new Date(event.start.dateTime)
              : event.start?.date
                ? new Date(event.start.date)
                : null

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {event.hangoutLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Join meeting"
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
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1" size="sm" asChild>
          <Link
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Calendar
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://calendar.google.com/calendar/r/eventedit"
            target="_blank"
            rel="noopener noreferrer"
            title="Add event"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}







