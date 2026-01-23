/**
 * Revenue Forecast Page
 * Displays revenue forecast with multiple scenarios
 */

'use client';

import { useState } from 'react';
import { useRevenueForecast } from '@/hooks/use-opportunities';
import { RevenueForecastChart } from '@/components/opportunities/revenue-forecast-chart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { handleApiError } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ForecastPeriod = 'month' | 'quarter' | 'year' | 'custom';

export default function RevenueForecastPage() {
  const [period, setPeriod] = useState<ForecastPeriod>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });

  const range =
    period === 'custom' && startDate && endDate
      ? {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }
      : undefined;

  const { data: forecast, isLoading, error, refetch } = useRevenueForecast(period, range);
  const errorMessage = error ? handleApiError(error) : null;

  const handlePeriodChange = (newPeriod: ForecastPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      // Auto-set dates based on period
      const now = new Date();
      setStartDate(now);
      if (newPeriod === 'month') {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setEndDate(nextMonth);
      } else if (newPeriod === 'quarter') {
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        setEndDate(nextQuarter);
      } else if (newPeriod === 'year') {
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setEndDate(nextYear);
      }
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load revenue forecast</AlertTitle>
          <AlertDescription>
            {typeof errorMessage === 'string' ? errorMessage : 'An error occurred while loading the revenue forecast. Please try again.'}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Forecast</h1>
          <p className="text-muted-foreground">View revenue projections across multiple scenarios</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Forecast Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Button onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh Forecast'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      {forecast ? (
        <RevenueForecastChart
          data={forecast}
          isLoading={isLoading}
          error={null}
          onRefresh={refetch}
          showScenarios={true}
          chartType="line"
        />
      ) : null}
    </div>
  );
}

