/**
 * Portfolio Risk Analysis Page
 * Risk analysis for a user's portfolio of opportunities
 */

'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { usePortfolioRevenueAtRisk } from '@/hooks/use-risk-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, DollarSign, TrendingDown, Users, ShieldOff } from 'lucide-react';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PortfolioRiskAnalysisPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user } = useAuth();
  
  // Check permissions: allow if viewing own portfolio OR has team/tenant risk read access
  const canReadTeamRisks = usePermissionCheck('risk:read:team');
  const canReadTenantRisks = usePermissionCheck('risk:read:tenant');
  const isOwnPortfolio = user?.id === userId;
  const hasAccess = isOwnPortfolio || canReadTeamRisks || canReadTenantRisks;

  const {
    data: portfolio,
    isLoading,
    error,
    refetch,
  } = usePortfolioRevenueAtRisk(userId);

  // Format currency
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Permission check
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <ShieldOff className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have permission to view this portfolio risk analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <ErrorDisplay 
              error={error || new Error('Portfolio data not available')} 
              onRetry={() => refetch()}
              title="Failed to Load Portfolio Risk Analysis"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Portfolio Risk Analysis</h1>
        <p className="text-muted-foreground">
          Risk assessment for user portfolio
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Deal Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.totalDealValue)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {portfolio.opportunityCount} opportunities
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue at Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(portfolio.totalRevenueAtRisk)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatPercent(portfolio.totalRevenueAtRisk / portfolio.totalDealValue)} of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk-Adjusted Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(portfolio.riskAdjustedValue)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Expected value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">High</span>
                <Badge variant="destructive">{portfolio.highRiskCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium</span>
                <Badge variant="default">{portfolio.mediumRiskCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low</span>
                <Badge variant="secondary">{portfolio.lowRiskCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
          <CardDescription>
            Individual opportunity risk assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Deal Value</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Revenue at Risk</TableHead>
                  <TableHead>Risk-Adjusted Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.opportunities.map((opp) => (
                  <TableRow key={opp.opportunityId}>
                    <TableCell className="font-medium">
                      {opp.opportunityId}
                    </TableCell>
                    <TableCell>{formatCurrency(opp.dealValue, opp.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          opp.riskScore >= 0.7
                            ? 'destructive'
                            : opp.riskScore >= 0.4
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {formatPercent(opp.riskScore)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(opp.revenueAtRisk, opp.currency)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(opp.riskAdjustedValue, opp.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


