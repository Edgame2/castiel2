/**
 * Calendar Intelligence Component
 * Analyzes calendar patterns for sales intelligence
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAnalyzeCalendar } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { CalendarIntelligence } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CalendarIntelligenceProps {
  className?: string;
  opportunityId?: string;
}

interface CalendarEvent {
  startTime: string | Date;
  endTime: string | Date;
  attendees: string[];
  status: string;
  subject: string;
}

export function CalendarIntelligence({ className, opportunityId }: CalendarIntelligenceProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [analyzedData, setAnalyzedData] = useState<CalendarIntelligence | null>(null);

  const {
    mutate: analyze,
    isPending: isAnalyzing,
    error,
  } = useAnalyzeCalendar();

  const addEvent = () => {
    setEvents([
      ...events,
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        attendees: [],
        status: 'scheduled',
        subject: '',
      },
    ]);
  };

  const updateEvent = (index: number, field: keyof CalendarEvent, value: any) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (!localOpportunityId || events.length === 0) return;

    analyze(
      {
        tenantId,
        opportunityId: localOpportunityId,
        events: events.map((e) => ({
          ...e,
          startTime: typeof e.startTime === 'string' ? new Date(e.startTime) : e.startTime,
          endTime: typeof e.endTime === 'string' ? new Date(e.endTime) : e.endTime,
        })),
      },
      {
        onSuccess: (data) => {
          setAnalyzedData(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to analyze calendar', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Intelligence
          </CardTitle>
          <CardDescription>
            Analyze calendar patterns for sales intelligence insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opportunity-id">Opportunity ID</Label>
              <Input
                id="opportunity-id"
                value={localOpportunityId}
                onChange={(e) => setLocalOpportunityId(e.target.value)}
                placeholder="Enter opportunity ID"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Calendar Events</Label>
                <Button variant="outline" size="sm" onClick={addEvent}>
                  Add Event
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((event, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Event {index + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEvent(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Subject"
                        value={event.subject}
                        onChange={(e) => updateEvent(index, 'subject', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="datetime-local"
                            value={
                              typeof event.startTime === 'string'
                                ? event.startTime
                                : new Date(event.startTime).toISOString().slice(0, 16)
                            }
                            onChange={(e) => updateEvent(index, 'startTime', new Date(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Input
                            type="datetime-local"
                            value={
                              typeof event.endTime === 'string'
                                ? event.endTime
                                : new Date(event.endTime).toISOString().slice(0, 16)
                            }
                            onChange={(e) => updateEvent(index, 'endTime', new Date(e.target.value))}
                          />
                        </div>
                      </div>
                      <Input
                        placeholder="Attendees (comma-separated)"
                        value={event.attendees.join(', ')}
                        onChange={(e) =>
                          updateEvent(
                            index,
                            'attendees',
                            e.target.value.split(',').map((a) => a.trim()).filter(Boolean)
                          )
                        }
                      />
                      <div>
                        <Label className="text-xs">Status</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={event.status}
                          onChange={(e) => updateEvent(index, 'status', e.target.value)}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No Show</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events added. Click "Add Event" to get started.
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!localOpportunityId || events.length === 0 || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Analyze Calendar Patterns
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to analyze calendar patterns'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {analyzedData && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Analysis</CardTitle>
                  <CardDescription>Detected calendar patterns and insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Meeting Frequency</p>
                      <p className="text-2xl font-bold">{analyzedData.patterns.meetingFrequency.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">meetings per period</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Average Attendees</p>
                      <p className="text-2xl font-bold">{analyzedData.patterns.averageAttendees.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">people per meeting</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Cancellation Rate</p>
                      <p className="text-2xl font-bold">{(analyzedData.patterns.cancellationRate * 100).toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {analyzedData.patterns.cancellationRate > 0.2 ? (
                          <span className="text-red-500">High cancellation rate</span>
                        ) : (
                          <span className="text-green-500">Normal cancellation rate</span>
                        )}
                      </p>
                    </div>
                    {analyzedData.patterns.optimalTiming && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Optimal Timing</p>
                        <div className="space-y-1">
                          <p className="text-lg font-bold capitalize">{analyzedData.patterns.optimalTiming.dayOfWeek}</p>
                          <p className="text-sm text-muted-foreground">{analyzedData.patterns.optimalTiming.timeOfDay}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{analyzedData.insights.summary}</p>
                  </div>

                  {analyzedData.insights.recommendations.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {analyzedData.insights.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
