/**
 * Teams Management Page
 * Admin page for managing sales teams
 */

'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/widgets/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTeams, useDeleteTeam } from '@/hooks/use-teams';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { EditTeamDialog } from '@/components/teams/edit-team-dialog';
import type { Team } from '@/types/team';
import { createColumns, TeamActionsProps } from './columns';

export default function TeamsPage() {
  const { t } = useTranslation(['common'] as any);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [filters, setFilters] = useState<any>({});

  const { data: teams = [], isLoading, error } = useTeams(filters);
  const deleteTeamMutation = useDeleteTeam();

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setEditDialogOpen(true);
  };

  const handleDelete = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setTeamToDelete(team);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    
    try {
      await deleteTeamMutation.mutateAsync(teamToDelete.id);
      toast.success(t('teams:deleteSuccess', 'Team deleted successfully'));
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || t('teams:deleteError', 'Failed to delete team'));
    }
  };

  const columns = createColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('teams:title', 'Teams')}</h1>
          <p className="text-muted-foreground">{t('teams:description', 'Manage sales teams')}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : 'Failed to load teams'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('teams:title', 'Teams')}</h1>
          <p className="text-muted-foreground">
            {t('teams:description', 'Manage sales teams and their members')}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('teams:createTeam', 'Create Team')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('teams:allTeams', 'All Teams')}</CardTitle>
          <CardDescription>
            {t('teams:listDescription', 'View and manage all sales teams')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={teams}
            columns={columns}
          />
        </CardContent>
      </Card>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedTeam && (
        <EditTeamDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          team={selectedTeam}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('teams:deleteTitle', 'Delete Team')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('teams:deleteDescription', 'Are you sure you want to delete the team "{name}"? This action cannot be undone.', {
                name: teamToDelete?.name || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTeamMutation.isPending}>
              {t('common:cancel' as any, 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteTeamMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTeamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:deleting' as any, 'Deleting...')}
                </>
              ) : (
                t('common:delete' as any, 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

