/**
 * Manager Dashboard Overview Component
 * High-level overview of manager dashboard metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ManagerDashboard } from '@/types/manager-dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ManagerDashboardOverviewProps {
  dashboard: ManagerDashboard;
}

export function ManagerDashboardOverview({ dashboard }: ManagerDashboardOverviewProps) {
  // Prepare data for charts
  const stageData = dashboard.opportunities.byStage.map((stage) => ({
    name: stage.stage,
    value: stage.totalValue,
    count: stage.count,
  }));

  const riskData = [
    { name: 'High', value: dashboard.risk.highRiskOpportunities, color: '#ef4444' },
    { name: 'Medium', value: dashboard.risk.mediumRiskOpportunities, color: '#f59e0b' },
    { name: 'Low', value: dashboard.risk.lowRiskOpportunities, color: '#10b981' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Opportunities by Stage */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunities by Stage</CardTitle>
          <CardDescription>Total value by sales stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
          <CardDescription>Opportunities by risk level</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Expected Revenue</span>
            <span className="font-semibold">
              ${dashboard.opportunities.expectedRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Revenue at Risk</span>
            <span className="font-semibold text-destructive">
              ${dashboard.risk.totalRevenueAtRisk.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Quota Target</span>
            <span className="font-semibold">
              ${dashboard.quotas.totalTarget.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Quota Attainment</span>
            <span className="font-semibold">
              {dashboard.quotas.attainment.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Teams</CardTitle>
          <CardDescription>Best performing teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard.teams.slice(0, 5).map((team) => (
              <div key={team.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {team.memberCount} members • {team.opportunityCount} opportunities
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${team.totalValue.toLocaleString()}</p>
                  {team.quotaAttainment !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {team.quotaAttainment.toFixed(1)}% quota
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



