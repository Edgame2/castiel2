/**
 * Teams Table Columns
 * Column definitions for teams data table
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Users, ExternalLink } from 'lucide-react';
import type { Team } from '@/types/team';

export interface TeamActionsProps {
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
}

export function createColumns({ onEdit, onDelete }: TeamActionsProps): ColumnDef<Team>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Team Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'manager',
      header: 'Manager',
      cell: ({ row }) => {
        const manager = row.original.manager;
        return (
          <div>
            <div className="font-medium">
              {manager.firstname && manager.lastname
                ? `${manager.firstname} ${manager.lastname}`
                : manager.email}
            </div>
            <div className="text-sm text-muted-foreground">{manager.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'members',
      header: 'Members',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.members.length}</span>
        </div>
      ),
    },
    {
      accessorKey: 'externalSource',
      header: 'Source',
      cell: ({ row }) => {
        const source = row.original.externalSource;
        if (!source || source === 'manual') {
          return <Badge variant="outline">Manual</Badge>;
        }
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{source.toUpperCase()}</Badge>
            {row.original.syncEnabled && (
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'syncEnabled',
      header: 'Sync',
      cell: ({ row }) => (
        <Badge variant={row.original.syncEnabled ? 'default' : 'outline'}>
          {row.original.syncEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isManuallyEdited',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isManuallyEdited ? 'secondary' : 'outline'}>
          {row.original.isManuallyEdited ? 'Edited' : 'Synced'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const team = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(team.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}



