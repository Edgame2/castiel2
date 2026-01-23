/**
 * Manager Risk Metrics Component
 * Displays risk analysis metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { ManagerDashboard } from '@/types/manager-dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ManagerRiskMetricsProps {
  risk: ManagerDashboard['risk'];
}

export function ManagerRiskMetrics({ risk }: ManagerRiskMetricsProps) {
  const riskData = [
    { name: 'High', value: risk.highRiskOpportunities, color: '#ef4444' },
    { name: 'Medium', value: risk.mediumRiskOpportunities, color: '#f59e0b' },
    { name: 'Low', value: risk.lowRiskOpportunities, color: '#10b981' },
  ];

  return (
    <div className="space-y-4">
      {/* Risk Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${risk.totalRevenueAtRisk.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {risk.highRiskOpportunities}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {risk.mediumRiskOpportunities}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {risk.lowRiskOpportunities}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
          <CardDescription>Number of opportunities by risk level</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

