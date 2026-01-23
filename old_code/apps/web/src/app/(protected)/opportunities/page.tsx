/**
 * Opportunities List Page
 * Displays list of opportunities owned by the user
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOpportunities } from '@/hooks/use-opportunities';
import type { OpportunityFilters } from '@/lib/api/opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { handleApiError } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Shard } from '@/types/api';
import { formatCurrency } from '@/lib/utils';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: opportunitiesResult,
    isLoading,
    error,
    refetch,
  } = useOpportunities(
    {
      ...filters,
      searchQuery: searchQuery || undefined,
    },
    { limit: 50 }
  );

  const opportunities = opportunitiesResult?.opportunities || [];
  const errorMessage = error ? handleApiError(error) : null;

  const handleSearch = () => {
    refetch();
  };

  const getRiskBadge = (opportunity: Shard) => {
    const data = opportunity.structuredData as any;
    const riskEvaluation = data?.riskEvaluation;
    if (!riskEvaluation) return null;

    const riskScore = riskEvaluation.riskScore || 0;
    const riskLevel = riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';
    const variant = riskLevel === 'high' ? 'destructive' : riskLevel === 'medium' ? 'default' : 'secondary';

    return (
      <Badge variant={variant} className="ml-2">
        {riskLevel.toUpperCase()} RISK
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">Manage your sales opportunities</p>
        </div>
        <Button onClick={() => router.push('/opportunities/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Opportunity
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load opportunities</AlertTitle>
          <AlertDescription>
            {typeof errorMessage === 'string' ? errorMessage : 'An error occurred while loading opportunities. Please try again.'}
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={filters.status as string || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.riskLevel as string || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, riskLevel: value === 'all' ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({})}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No opportunities found</p>
            </CardContent>
          </Card>
        ) : (
          opportunities.map((opportunity) => {
            const data = opportunity.structuredData as any;
            return (
              <Card
                key={opportunity.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => router.push(`/opportunities/${opportunity.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {data?.name || 'Unnamed Opportunity'}
                        </h3>
                        {getRiskBadge(opportunity)}
                        <Badge variant="outline">{data?.stage || 'Unknown'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {data?.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Value: {formatCurrency(data?.value || 0, data?.currency || 'USD')}
                        </span>
                        {data?.closeDate && (
                          <span className="text-muted-foreground">
                            Close Date: {new Date(data.closeDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {data?.riskEvaluation?.revenueAtRisk && (
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Revenue at Risk</div>
                          <div className="text-sm font-semibold text-destructive">
                            {formatCurrency(data.riskEvaluation.revenueAtRisk, data?.currency || 'USD')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

