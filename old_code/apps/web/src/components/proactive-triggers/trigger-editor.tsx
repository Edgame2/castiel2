'use client';

/**
 * Proactive Trigger Editor Component
 * Form for creating and editing proactive triggers
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JsonEditor } from '@/components/json-editor';
import { useCreateProactiveTrigger, useUpdateProactiveTrigger } from '@/hooks/use-proactive-triggers';
import { useShardTypes } from '@/hooks/use-shard-types';
import type { ProactiveTrigger, TriggerCondition, TriggerConditionGroup } from '@/lib/api/proactive-triggers';
import { Loader2 } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const triggerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required']),
  shardTypeId: z.string().min(1, 'Shard type is required'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  cooldownHours: z.number().min(0, 'Cooldown must be 0 or greater'),
  isActive: z.boolean().default(true),
  schedule: z.object({
    cron: z.string().optional(),
    intervalMinutes: z.number().optional(),
    timezone: z.string().optional(),
  }).optional(),
  eventTriggers: z.array(z.string()).optional(),
  messageTemplate: z.string().optional(),
  contextTemplateId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  conditions: z.union([
    z.array(z.any()),
    z.object({
      operator: z.enum(['and', 'or']),
      conditions: z.array(z.any()),
    }),
  ]),
});

type TriggerFormValues = z.infer<typeof triggerSchema>;

interface ProactiveTriggerEditorProps {
  trigger?: ProactiveTrigger;
  onCancel?: () => void;
  onSaved?: () => void;
}

export function ProactiveTriggerEditor({
  trigger,
  onCancel,
  onSaved,
}: ProactiveTriggerEditorProps) {
  const isEditing = !!trigger;
  const createMutation = useCreateProactiveTrigger();
  const updateMutation = useUpdateProactiveTrigger();
  const { data: shardTypesData } = useShardTypes({ limit: 1000 });

  const [conditionsJson, setConditionsJson] = useState<string>('');

  const form = useForm<TriggerFormValues>({
    resolver: zodResolver(triggerSchema) as any,
    defaultValues: {
      name: trigger?.name || '',
      description: trigger?.description || '',
      type: trigger?.type || 'stale_opportunity',
      shardTypeId: trigger?.shardTypeId || '',
      priority: trigger?.priority || 'medium',
      cooldownHours: trigger?.cooldownHours || 24,
      isActive: trigger?.isActive ?? true,
      schedule: trigger?.schedule || undefined,
      eventTriggers: trigger?.eventTriggers || [],
      messageTemplate: trigger?.messageTemplate || '',
      contextTemplateId: trigger?.contextTemplateId || '',
      metadata: trigger?.metadata || {},
      conditions: trigger?.conditions || [],
    },
  });

  // Initialize conditions JSON
  useEffect(() => {
    if (trigger?.conditions) {
      setConditionsJson(JSON.stringify(trigger.conditions, null, 2));
    } else {
      setConditionsJson(JSON.stringify([], null, 2));
    }
  }, [trigger]);

  const onSubmit = async (data: TriggerFormValues) => {
    try {
      // Parse conditions from JSON
      let conditions: TriggerCondition[] | TriggerConditionGroup;
      try {
        conditions = JSON.parse(conditionsJson);
      } catch (error) {
        form.setError('conditions', {
          type: 'manual',
          message: 'Invalid JSON format for conditions',
        });
        return;
      }

      const payload = {
        ...data,
        conditions,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          triggerId: trigger.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSaved?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Error saving trigger', 3, {
        errorMessage: errorObj.message,
        triggerId: trigger?.id,
      })
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Configure the basic properties of the trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Stale Opportunity Alert" />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this trigger.
                  </FormDescription>
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
                      {...field}
                      placeholder="Trigger fires when an opportunity has had no activity for 14 days"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of what this trigger does.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insight Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deal_at_risk">Deal at Risk</SelectItem>
                        <SelectItem value="milestone_approaching">Milestone Approaching</SelectItem>
                        <SelectItem value="stale_opportunity">Stale Opportunity</SelectItem>
                        <SelectItem value="missing_follow_up">Missing Follow-up</SelectItem>
                        <SelectItem value="relationship_cooling">Relationship Cooling</SelectItem>
                        <SelectItem value="action_required">Action Required</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shardTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shard Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shard type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shardTypesData?.items.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.displayName || st.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of shard this trigger applies to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cooldownHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        min={0}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum hours between insights for the same shard.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions</CardTitle>
            <CardDescription>
              Define the conditions that must be met for this trigger to fire. Use JSON format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <JsonEditor
                value={JSON.parse(conditionsJson || '[]')}
                onChange={(value) => {
                  setConditionsJson(JSON.stringify(value, null, 2));
                  form.setValue('conditions', value as any);
                }}
                height="300px"
              />
              <FormDescription>
                Conditions can be an array of condition objects or a condition group with logical operators.
                Example: {`[{"field": "structuredData.lastActivityDate", "operator": "lt", "relativeDate": "-14d"}]`}
              </FormDescription>
              {form.formState.errors.conditions && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.conditions.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule (Optional)</CardTitle>
            <CardDescription>
              Configure when this trigger should be evaluated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="schedule.cron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="0 9 * * 1-5" />
                  </FormControl>
                  <FormDescription>
                    Cron expression for scheduled evaluation (e.g., "0 9 * * 1-5" for 9 AM weekdays).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Trigger' : 'Create Trigger'}
          </Button>
        </div>
      </form>
    </Form>
  );
}








