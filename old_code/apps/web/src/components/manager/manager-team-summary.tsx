/**
 * Manager Team Summary Component
 * Displays team and team member summaries
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import type { TeamSummary, TeamMemberSummary } from '@/types/manager-dashboard';
import { Users, DollarSign, Target } from 'lucide-react';

interface ManagerTeamSummaryProps {
  teams: TeamSummary[];
  teamMembers: TeamMemberSummary[];
}

export function ManagerTeamSummary({ teams, teamMembers }: ManagerTeamSummaryProps) {
  // Prepare team table columns
  const teamColumns = [
    {
      accessorKey: 'name',
      header: 'Team Name',
    },
    {
      accessorKey: 'memberCount',
      header: 'Members',
    },
    {
      accessorKey: 'opportunityCount',
      header: 'Opportunities',
    },
    {
      accessorKey: 'totalValue',
      header: 'Total Value',
      cell: ({ row }: any) => `$${row.original.totalValue.toLocaleString()}`,
    },
    {
      accessorKey: 'expectedRevenue',
      header: 'Expected Revenue',
      cell: ({ row }: any) => `$${row.original.expectedRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'revenueAtRisk',
      header: 'Revenue at Risk',
      cell: ({ row }: any) => (
        <span className="text-destructive">
          ${row.original.revenueAtRisk.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'quotaAttainment',
      header: 'Quota Attainment',
      cell: ({ row }: any) =>
        row.original.quotaAttainment !== undefined
          ? `${row.original.quotaAttainment.toFixed(1)}%`
          : 'N/A',
    },
  ];

  // Prepare member table columns
  const memberColumns = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'opportunityCount',
      header: 'Opportunities',
    },
    {
      accessorKey: 'totalValue',
      header: 'Total Value',
      cell: ({ row }: any) => `$${row.original.totalValue.toLocaleString()}`,
    },
    {
      accessorKey: 'quotaAttainment',
      header: 'Quota Attainment',
      cell: ({ row }: any) =>
        row.original.quotaAttainment !== undefined
          ? `${row.original.quotaAttainment.toFixed(1)}%`
          : 'N/A',
    },
    {
      accessorKey: 'revenueAtRisk',
      header: 'Revenue at Risk',
      cell: ({ row }: any) => (
        <span className="text-destructive">
          ${row.original.revenueAtRisk.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Overview of all teams</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={teamColumns} data={teams} />
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Individual team member performance</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={memberColumns} data={teamMembers} />
        </CardContent>
      </Card>
    </div>
  );
}



