/**
 * Edit Team Dialog Component
 * Dialog for editing an existing sales team
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { UserPicker } from '@/components/ui/user-picker';
import { useUpdateTeam, useTeams } from '@/hooks/use-teams';
import { useUsers } from '@/hooks/use-users';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Team, UpdateTeamInput, TeamManager, TeamMember } from '@/types/team';
import type { User } from '@/types/api';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
}

export function EditTeamDialog({ open, onOpenChange, team }: EditTeamDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState(team.name);
  const [managerUserId, setManagerUserId] = useState<string | null>(team.manager.userId || null);
  const [parentTeamId, setParentTeamId] = useState<string | null | undefined>(team.parentTeamId);
  const [syncEnabled, setSyncEnabled] = useState(team.syncEnabled);
  const [memberUserIds, setMemberUserIds] = useState<string[]>(
    team.members.map(m => m.userId).filter((id): id is string => !!id)
  );

  const updateTeamMutation = useUpdateTeam(team.id);
  const { data: teams = [] } = useTeams();
  
  // Fetch users for selected manager and members
  const { data: usersData } = useUsers({ limit: 100 });
  const users = usersData?.users || [];

  // Get selected manager and members as User objects
  const selectedManager = users.find(u => u.id === managerUserId);
  const selectedMembers = users.filter(u => memberUserIds.includes(u.id));

  // Update form when team changes
  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setManagerUserId(team.manager.userId || null);
      setParentTeamId(team.parentTeamId);
      setSyncEnabled(team.syncEnabled);
      setMemberUserIds(
        team.members.map(m => m.userId).filter((id): id is string => !!id)
      );
      setError(null);
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (!managerUserId) {
      setError('Manager is required');
      return;
    }

    if (!selectedManager) {
      setError('Selected manager not found');
      return;
    }

    try {
      const manager: TeamManager = {
        userId: selectedManager.id,
        email: selectedManager.email,
        firstname: selectedManager.firstName,
        lastname: selectedManager.lastName,
      };

      const teamMembers: TeamMember[] = selectedMembers.map(user => ({
        userId: user.id,
        email: user.email,
        firstname: user.firstName,
        lastname: user.lastName,
      }));

      const teamData: UpdateTeamInput = {
        name: teamName.trim(),
        manager,
        members: teamMembers,
        parentTeamId: parentTeamId === undefined ? undefined : (parentTeamId || null),
        syncEnabled,
      };

      await updateTeamMutation.mutateAsync(teamData);
      
      toast.success('Team updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update team');
      toast.error(err.message || 'Failed to update team');
    }
  };

  const isLoading = updateTeamMutation.isPending;

  // Filter out current team from parent team options
  const availableParentTeams = teams.filter(t => t.id !== team.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update team details, manager, and members
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name *</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Sales Team North"
              required
            />
          </div>

          {/* Manager */}
          <div className="space-y-2">
            <Label htmlFor="manager">Manager *</Label>
            <UserPicker
              value={managerUserId}
              onChange={(value) => setManagerUserId(Array.isArray(value) ? value[0] || null : value)}
              placeholder="Select team manager..."
              displayFormat="full"
              showAvatar={true}
            />
          </div>

          {/* Parent Team */}
          <div className="space-y-2">
            <Label htmlFor="parentTeam">Parent Team (Optional)</Label>
            <Select
              value={parentTeamId || ''}
              onValueChange={(value) => setParentTeamId(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {availableParentTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label htmlFor="members">Team Members</Label>
            <UserPicker
              value={memberUserIds}
              onChange={(value) => setMemberUserIds(Array.isArray(value) ? value : value ? [value] : [])}
              multiple={true}
              placeholder="Select team members..."
              displayFormat="full"
              showAvatar={true}
            />
          </div>

          {/* Sync Enabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="syncEnabled">Enable SSO Sync</Label>
              <p className="text-sm text-muted-foreground">
                Allow automatic synchronization from SSO provider
              </p>
            </div>
            <Switch
              id="syncEnabled"
              checked={syncEnabled}
              onCheckedChange={setSyncEnabled}
            />
          </div>

          {/* Sync Status Info */}
          {team.externalSource && team.externalSource !== 'manual' && (
            <Alert>
              <AlertDescription>
                This team is synced from {team.externalSource.toUpperCase()}.
                {team.isManuallyEdited && ' It has been manually edited and will not be automatically synced.'}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

