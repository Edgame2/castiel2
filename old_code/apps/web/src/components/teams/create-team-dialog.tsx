/**
 * Create Team Dialog Component
 * Dialog for creating a new sales team
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
import { useCreateTeam, useTeams } from '@/hooks/use-teams';
import { useUsers } from '@/hooks/use-users';
import { AlertCircle, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateTeamInput, TeamManager, TeamMember } from '@/types/team';
import type { User } from '@/types/api';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [managerUserId, setManagerUserId] = useState<string | null>(null);
  const [parentTeamId, setParentTeamId] = useState<string | undefined>(undefined);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);

  const createTeamMutation = useCreateTeam();
  const { data: teams = [] } = useTeams();

  // Fetch users for selected manager and members
  const { data: usersData } = useUsers({ limit: 100 });
  const users = usersData?.users || [];

  // Get selected manager and members as User objects
  const selectedManager = users.find(u => u.id === managerUserId);
  const selectedMembers = users.filter(u => memberUserIds.includes(u.id));

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTeamName('');
      setManagerUserId(null);
      setParentTeamId(undefined);
      setSyncEnabled(false);
      setMemberUserIds([]);
      setError(null);
    }
  }, [open]);

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

      const teamData: CreateTeamInput = {
        name: teamName.trim(),
        manager,
        members: teamMembers,
        parentTeamId: parentTeamId || undefined,
        externalSource: 'manual',
        syncEnabled,
      };

      await createTeamMutation.mutateAsync(teamData);
      
      toast.success('Team created successfully');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
      toast.error(err.message || 'Failed to create team');
    }
  };

  const isLoading = createTeamMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new sales team with a manager and members
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
              onValueChange={(value) => setParentTeamId(value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
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
              Create Team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

