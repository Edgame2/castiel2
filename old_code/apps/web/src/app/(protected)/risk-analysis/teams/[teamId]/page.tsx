/**
 * Team Risk Analysis Page
 * Risk analysis for a team's portfolio of opportunities
 */

'use client';

import { useParams } from 'next/navigation';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { useTeamRevenueAtRisk } from '@/hooks/use-risk-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, DollarSign, Users, ShieldOff } from 'lucide-react';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TeamRiskAnalysisPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  
  // Check permissions: require team or tenant risk read access
  const canReadTeamRisks = usePermissionCheck('risk:read:team');
  const canReadTenantRisks = usePermissionCheck('risk:read:tenant');
  const hasAccess = canReadTeamRisks || canReadTenantRisks;

  const {
    data: team,
    isLoading,
    error,
    refetch,
  } = useTeamRevenueAtRisk(teamId);

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
                  You don't have permission to view team risk analysis. Manager or Director role required.
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

  if (error || !team) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <ErrorDisplay 
              error={error || new Error('Team data not available')} 
              onRetry={() => refetch()}
              title="Failed to Load Team Risk Analysis"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Team Risk Analysis</h1>
        <p className="text-muted-foreground">
          Risk assessment for team portfolio
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Deal Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(team.totalDealValue)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {team.opportunityCount} opportunities
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue at Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(team.totalRevenueAtRisk)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatPercent(team.totalRevenueAtRisk / team.totalDealValue)} of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk-Adjusted Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(team.riskAdjustedValue)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Expected value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.memberCount}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Active members
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Individual portfolio risk assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Opportunities</TableHead>
                  <TableHead>Total Deal Value</TableHead>
                  <TableHead>Revenue at Risk</TableHead>
                  <TableHead>Risk-Adjusted Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">
                      {member.userId}
                    </TableCell>
                    <TableCell>{member.opportunityCount}</TableCell>
                    <TableCell>{formatCurrency(member.totalDealValue)}</TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(member.totalRevenueAtRisk)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(member.riskAdjustedValue)}
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


