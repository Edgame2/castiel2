/**
 * Manager Dashboard Page
 * Displays aggregated metrics for sales managers
 */

'use client';

import { useState } from 'react';
import { useManagerDashboard } from '@/hooks/use-manager-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Target, TrendingUp, AlertTriangle, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { ManagerDashboardOverview } from '@/components/manager/manager-dashboard-overview';
import { ManagerTeamSummary } from '@/components/manager/manager-team-summary';
import { ManagerOpportunities } from '@/components/manager/manager-opportunities';
import { ManagerQuotas } from '@/components/manager/manager-quotas';
import { ManagerRiskMetrics } from '@/components/manager/manager-risk-metrics';
import { ManagerClosedWonLost } from '@/components/manager/manager-closed-won-lost';
import { useAuth } from '@/contexts/auth-context';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<'my-team' | 'all-teams'>('my-team');
  
  const {
    data: dashboard,
    isLoading,
    error,
  } = useManagerDashboard(
    user?.id || '',
    { view: viewType },
    !!user?.id
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">Error loading dashboard data</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : 'Failed to load dashboard'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of team performance, opportunities, and quotas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewType === 'my-team' ? 'default' : 'outline'}
            onClick={() => setViewType('my-team')}
          >
            My Team
          </Button>
          <Button
            variant={viewType === 'all-teams' ? 'default' : 'outline'}
            onClick={() => setViewType('all-teams')}
          >
            All Teams
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.opportunities.total}</div>
            <p className="text-xs text-muted-foreground">
              ${dashboard.opportunities.totalValue.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quota Attainment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.quotas.attainment.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted: {dashboard.quotas.riskAdjustedAttainment.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboard.risk.totalRevenueAtRisk.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard.risk.highRiskOpportunities} high-risk opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Across {dashboard.teams.length} team{dashboard.teams.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="closed">Closed Won/Lost</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ManagerDashboardOverview dashboard={dashboard} />
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <ManagerTeamSummary teams={dashboard.teams} teamMembers={dashboard.teamMembers} />
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <ManagerOpportunities
            opportunities={dashboard.opportunities}
            byStage={dashboard.opportunities.byStage}
          />
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <ManagerQuotas quotas={dashboard.quotas} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <ManagerRiskMetrics risk={dashboard.risk} />
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <ManagerClosedWonLost closedWonLost={dashboard.closedWonLost} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

