/**
 * Manager Quotas Component
 * Displays quota performance metrics
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ManagerDashboard } from '@/types/manager-dashboard';

interface ManagerQuotasProps {
  quotas: ManagerDashboard['quotas'];
}

export function ManagerQuotas({ quotas }: ManagerQuotasProps) {
  return (
    <div className="space-y-4">
      {/* Overall Quota Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Quota Performance</CardTitle>
          <CardDescription>Team and individual quota attainment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Quota Attainment</span>
              <span className="text-sm font-bold">{quotas.attainment.toFixed(1)}%</span>
            </div>
            <Progress value={quotas.attainment} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Risk-Adjusted Attainment</span>
              <span className="text-sm font-bold">
                {quotas.riskAdjustedAttainment.toFixed(1)}%
              </span>
            </div>
            <Progress value={quotas.riskAdjustedAttainment} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Target</p>
              <p className="text-2xl font-bold">${quotas.totalTarget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-2xl font-bold">${quotas.totalActual.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Forecasted</p>
              <p className="text-2xl font-bold">${quotas.totalForecasted.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk-Adjusted</p>
              <p className="text-2xl font-bold">${quotas.totalRiskAdjusted.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Quota */}
      {quotas.teamQuota && (
        <Card>
          <CardHeader>
            <CardTitle>Team Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Target</span>
                <span className="font-semibold">
                  ${(quotas.teamQuota as any).target?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Actual</span>
                <span className="font-semibold">
                  ${(quotas.teamQuota as any).actual?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Attainment</span>
                <span className="font-semibold">
                  {((quotas.teamQuota as any).attainment || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Quotas */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Quotas</CardTitle>
          <CardDescription>Quota performance by team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotas.individualQuotas.map((item) => (
              <div key={item.userId} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">User {item.userId}</span>
                  <span className="text-sm font-semibold">
                    {(item.quota as any).attainment?.toFixed(1) || '0'}%
                  </span>
                </div>
                <Progress
                  value={(item.quota as any).attainment || 0}
                  className="h-2"
                />
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-semibold">
                      ${((item.quota as any).target || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-semibold">
                      ${(item.quota as any).actual?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Forecasted</p>
                    <p className="font-semibold">
                      ${item.quota.forecasted?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



