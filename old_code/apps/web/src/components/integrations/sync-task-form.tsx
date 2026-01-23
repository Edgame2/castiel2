'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  Clock,
  Calendar,
  Zap,
  Hand,
  Bell,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type {
  SyncTask,
  SyncDirection,
  ScheduleType,
  IntervalUnit,
  ConflictResolution,
  ConversionSchema,
} from '@/types/integration.types';

interface SyncTaskFormProps {
  integrationId: string;
  conversionSchemas: ConversionSchema[];
  initialData?: Partial<SyncTask>;
  onSubmit: (data: SyncTaskFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface SyncTaskFormData {
  name: string;
  description?: string;
  conversionSchemaId: string;
  direction: SyncDirection;
  schedule: {
    type: ScheduleType;
    config: {
      type: ScheduleType;
      interval?: number;
      unit?: IntervalUnit;
      expression?: string;
      timezone?: string;
    };
  };
  conflictResolution?: ConflictResolution;
  retryConfig: {
    maxRetries: number;
    retryDelaySeconds: number;
    exponentialBackoff: boolean;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onPartial: boolean;
    recipients: string[];
  };
  config: Record<string, any>;
}

const DIRECTION_OPTIONS: Array<{ value: SyncDirection; label: string; description: string; icon: React.ReactNode }> = [
  {
    value: 'pull',
    label: 'Pull',
    description: 'Import data from integration to Castiel',
    icon: <ArrowDownToLine className="h-5 w-5" />,
  },
  {
    value: 'push',
    label: 'Push',
    description: 'Export data from Castiel to integration',
    icon: <ArrowUpFromLine className="h-5 w-5" />,
  },
  {
    value: 'bidirectional',
    label: 'Bidirectional',
    description: 'Sync data in both directions',
    icon: <ArrowRightLeft className="h-5 w-5" />,
  },
];

const SCHEDULE_OPTIONS: Array<{ value: ScheduleType; label: string; description: string; icon: React.ReactNode }> = [
  {
    value: 'manual',
    label: 'Manual',
    description: 'Run sync manually when needed',
    icon: <Hand className="h-5 w-5" />,
  },
  {
    value: 'interval',
    label: 'Interval',
    description: 'Run at regular intervals',
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: 'cron',
    label: 'Cron',
    description: 'Use cron expression for precise scheduling',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: 'realtime',
    label: 'Real-time',
    description: 'Sync immediately when changes detected',
    icon: <Zap className="h-5 w-5" />,
  },
];

const INTERVAL_UNITS: IntervalUnit[] = ['minutes', 'hours', 'days', 'weeks'];

const CONFLICT_RESOLUTION_OPTIONS: Array<{ value: ConflictResolution; label: string; description: string }> = [
  { value: 'newest_wins', label: 'Newest Wins', description: 'The most recently modified record wins' },
  { value: 'source_wins', label: 'Source Wins', description: 'Integration data always overwrites' },
  { value: 'target_wins', label: 'Target Wins', description: 'Castiel data is preserved' },
  { value: 'manual', label: 'Manual', description: 'Flag conflicts for manual review' },
  { value: 'merge', label: 'Merge', description: 'Attempt to merge non-conflicting fields' },
];

const COMMON_CRON_EXPRESSIONS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'First of every month', value: '0 0 1 * *' },
];

export function SyncTaskForm({
  integrationId,
  conversionSchemas,
  initialData,
  onSubmit,
  isSubmitting,
}: SyncTaskFormProps) {
  const [recipientInput, setRecipientInput] = useState('');

  const form = useForm<SyncTaskFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      conversionSchemaId: initialData?.conversionSchemaId || '',
      direction: initialData?.direction || 'pull',
      schedule: initialData?.schedule || {
        type: 'interval',
        config: {
          type: 'interval',
          interval: 1,
          unit: 'hours',
        },
      },
      conflictResolution: initialData?.conflictResolution || 'newest_wins',
      retryConfig: initialData?.retryConfig || {
        maxRetries: 3,
        retryDelaySeconds: 60,
        exponentialBackoff: true,
      },
      notifications: initialData?.notifications || {
        onSuccess: false,
        onFailure: true,
        onPartial: true,
        recipients: [],
      },
      config: initialData?.config || {},
    },
  });

  const scheduleType = form.watch('schedule.type');
  const direction = form.watch('direction');
  const notifications = form.watch('notifications');

  const handleAddRecipient = () => {
    if (recipientInput && recipientInput.includes('@')) {
      const current = form.getValues('notifications.recipients');
      if (!current.includes(recipientInput)) {
        form.setValue('notifications.recipients', [...current, recipientInput]);
      }
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    const current = form.getValues('notifications.recipients');
    form.setValue('notifications.recipients', current.filter(r => r !== email));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your sync task a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sync Salesforce Contacts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this sync task does..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conversionSchemaId"
              rules={{ required: 'Conversion schema is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversion Schema</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a schema" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conversionSchemas.map(schema => (
                        <SelectItem key={schema.id} value={schema.id}>
                          <div>
                            <p>{schema.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {schema.source.entity} → {schema.target.shardTypeId}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which schema to use for data transformation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sync Direction */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Direction</CardTitle>
            <CardDescription>
              Choose how data flows between systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {DIRECTION_OPTIONS.map(option => (
                      <div
                        key={option.value}
                        className={`relative flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors ${
                          field.value === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => field.onChange(option.value)}
                      >
                        <div className={field.value === option.value ? 'text-primary' : 'text-muted-foreground'}>
                          {option.icon}
                        </div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground text-center">
                          {option.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {direction === 'bidirectional' && (
              <FormField
                control={form.control}
                name="conflictResolution"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Conflict Resolution</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONFLICT_RESOLUTION_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <p>{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How to handle conflicts when the same record is modified in both systems
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Configure when and how often to run the sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="schedule.type"
              render={({ field }) => (
                <FormItem>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {SCHEDULE_OPTIONS.map(option => (
                      <div
                        key={option.value}
                        className={`relative flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors ${
                          field.value === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          field.onChange(option.value);
                          form.setValue('schedule.config.type', option.value);
                        }}
                      >
                        <div className={field.value === option.value ? 'text-primary' : 'text-muted-foreground'}>
                          {option.icon}
                        </div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground text-center">
                          {option.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {scheduleType === 'interval' && (
              <div className="flex items-center gap-3">
                <FormField
                  control={form.control}
                  name="schedule.config.interval"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Every</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schedule.config.unit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTERVAL_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {scheduleType === 'cron' && (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="schedule.config.expression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input placeholder="0 9 * * *" {...field} />
                      </FormControl>
                      <FormDescription>
                        Standard cron format: minute hour day-of-month month day-of-week
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <div className="flex flex-wrap gap-2">
                  {COMMON_CRON_EXPRESSIONS.map(expr => (
                    <Badge
                      key={expr.value}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => form.setValue('schedule.config.expression', expr.value)}
                    >
                      {expr.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {scheduleType !== 'manual' && (
              <FormField
                control={form.control}
                name="schedule.config.timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'UTC'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Retry Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Retry Configuration
            </CardTitle>
            <CardDescription>
              Configure how failed syncs should be retried
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="retryConfig.maxRetries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Retries</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>Maximum number of retry attempts (0-10)</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retryConfig.retryDelaySeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retry Delay (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>Initial delay before retrying</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="retryConfig.exponentialBackoff"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exponential Backoff</FormLabel>
                    <FormDescription>
                      Double the delay after each failed retry attempt
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure email notifications for sync events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="notifications.onSuccess"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">On Success</FormLabel>
                      <FormDescription>
                        Send notification when sync completes successfully
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifications.onFailure"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">On Failure</FormLabel>
                      <FormDescription>
                        Send notification when sync fails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifications.onPartial"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">On Partial Success</FormLabel>
                      <FormDescription>
                        Send notification when sync completes with some errors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {(notifications.onSuccess || notifications.onFailure || notifications.onPartial) && (
              <div className="space-y-3">
                <Label>Notification Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddRecipient}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {notifications.recipients.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData?.name ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Form>
  );
}











