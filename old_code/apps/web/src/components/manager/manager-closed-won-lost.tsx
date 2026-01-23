/**
 * Manager Closed Won/Lost Component
 * Displays closed won and lost opportunities metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import type { ManagerDashboard } from '@/types/manager-dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ManagerClosedWonLostProps {
  closedWonLost: ManagerDashboard['closedWonLost'];
}

export function ManagerClosedWonLost({ closedWonLost }: ManagerClosedWonLostProps) {
  const chartData = [
    {
      name: 'Won',
      count: closedWonLost.won.count,
      value: closedWonLost.won.value,
      color: '#10b981',
    },
    {
      name: 'Lost',
      count: closedWonLost.lost.count,
      value: closedWonLost.lost.value,
      color: '#ef4444',
    },
  ];

  const periodStart = new Date(closedWonLost.period.startDate).toLocaleDateString();
  const periodEnd = new Date(closedWonLost.period.endDate).toLocaleDateString();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {closedWonLost.won.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${closedWonLost.won.value.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Lost</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {closedWonLost.lost.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${closedWonLost.lost.value.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {closedWonLost.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {closedWonLost.won.count} / {closedWonLost.won.count + closedWonLost.lost.count} opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {periodStart} - {periodEnd}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reporting period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Won vs Lost (Count)</CardTitle>
            <CardDescription>Number of opportunities won vs lost</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Won vs Lost (Value)</CardTitle>
            <CardDescription>Total value of won vs lost opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

