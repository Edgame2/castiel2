/**
 * Create Opportunity Page
 * Form for creating new opportunities manually
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { shardApi, shardTypeApi } from '@/lib/api/shards';
import { useAuth } from '@/contexts/auth-context';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const opportunityFormSchema = z.object({
  name: z.string().min(1, 'Opportunity name is required'),
  description: z.string().optional(),
  stage: z.string().min(1, 'Stage is required'),
  status: z.enum(['open', 'won', 'lost']).optional(),
  amount: z.number().min(0, 'Amount must be positive').optional(),
  currency: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  closeDate: z.date().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  type: z.enum(['new_business', 'existing_business', 'renewal', 'upsell', 'cross_sell', 'expansion', 'other']).optional(),
  leadSource: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

// Common opportunity stages
const OPPORTUNITY_STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

export default function CreateOpportunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [opportunityTypeId, setOpportunityTypeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpportunityType = async () => {
      try {
        const types = await shardTypeApi.getShardTypes();
        const opportunityType = types.find((t) => t.name === 'c_opportunity');
        if (opportunityType) {
          setOpportunityTypeId(opportunityType.id);
        } else {
          toast.error('Opportunity shard type not found');
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to fetch shard types', 3, {
          errorMessage: errorObj.message,
        })
        toast.error('Failed to load opportunity configuration');
      }
    };
    fetchOpportunityType();
  }, []);

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: '',
      description: '',
      stage: 'Prospecting',
      status: 'open',
      currency: 'USD',
      type: 'new_business',
    },
  });

  async function onSubmit(data: OpportunityFormValues) {
    if (!opportunityTypeId || !user) {
      toast.error('Opportunity type not loaded or user not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Build structuredData from form values
      const structuredData: Record<string, any> = {
        name: data.name,
        stage: data.stage,
        status: data.status,
        currency: data.currency,
      };

      if (data.description) {
        structuredData.description = data.description;
      }
      if (data.amount !== undefined) {
        structuredData.amount = data.amount;
      }
      if (data.probability !== undefined) {
        structuredData.probability = data.probability;
      }
      if (data.closeDate) {
        structuredData.closeDate = data.closeDate.toISOString();
      }
      if (data.accountId) {
        structuredData.accountId = data.accountId;
      }
      if (data.accountName) {
        structuredData.accountName = data.accountName;
      }
      if (data.type) {
        structuredData.type = data.type;
      }
      if (data.leadSource) {
        structuredData.leadSource = data.leadSource;
      }

      // Set owner to current user
      structuredData.ownerId = user.id;
      structuredData.ownerName = user.name || user.email;

      // Create the opportunity shard
      const shard = await shardApi.createShard({
        name: data.name,
        description: data.description,
        shardTypeId: opportunityTypeId,
        structuredData,
      });

      toast.success('Opportunity created successfully');
      router.push(`/opportunities/${shard.id}`);
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to create opportunity', 3, {
        errorMessage: errorObj.message,
        opportunityName: data.name,
      })
      toast.error(error?.message || 'Failed to create opportunity');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Opportunity</h1>
          <p className="text-muted-foreground">Create a new sales opportunity</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opportunity Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter opportunity name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new_business">New Business</SelectItem>
                          <SelectItem value="existing_business">Existing Business</SelectItem>
                          <SelectItem value="renewal">Renewal</SelectItem>
                          <SelectItem value="upsell">Upsell</SelectItem>
                          <SelectItem value="cross_sell">Cross-Sell</SelectItem>
                          <SelectItem value="expansion">Expansion</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Win probability as a percentage</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closeDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Close Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account name" {...field} />
                      </FormControl>
                      <FormDescription>Name of the associated account</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Website, Referral, Trade Show" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter opportunity description"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !opportunityTypeId}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Opportunity
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

