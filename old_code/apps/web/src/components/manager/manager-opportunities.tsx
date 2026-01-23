/**
 * Manager Opportunities Component
 * Displays opportunity metrics and stage breakdown
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StageSummary } from '@/types/manager-dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ManagerOpportunitiesProps {
  opportunities: {
    total: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
    riskAdjustedValue: number;
  };
  byStage: StageSummary[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ManagerOpportunities({ opportunities, byStage }: ManagerOpportunitiesProps) {
  const pieData = byStage.map((stage) => ({
    name: stage.stage,
    value: stage.count,
  }));

  const barData = byStage.map((stage) => ({
    name: stage.stage,
    value: stage.totalValue,
    expected: stage.expectedRevenue,
    atRisk: stage.revenueAtRisk,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${opportunities.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${opportunities.expectedRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${opportunities.revenueAtRisk.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Opportunities by Stage (Count)</CardTitle>
            <CardDescription>Distribution of opportunities across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value by Stage</CardTitle>
            <CardDescription>Total value, expected revenue, and risk by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" name="Total Value" />
                <Bar dataKey="expected" fill="#00C49F" name="Expected Revenue" />
                <Bar dataKey="atRisk" fill="#FF8042" name="Revenue at Risk" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



