'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/types/documents';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPicker } from '@/components/ui/user-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Check } from 'lucide-react';
import { useACL, PermissionLevel } from '@/hooks/useACL';
import { toast } from 'sonner';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ShareTarget {
  userId?: string;
  roleId?: string;
  permissions: PermissionLevel[];
}

interface ShareDocumentDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Dialog for sharing documents with users or roles
 * Allows granting specific permissions (read, write, delete, admin)
 */
export function ShareDocumentDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
}: ShareDocumentDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [defaultPermission, setDefaultPermission] = useState<PermissionLevel>('read');
  const [shareTargets, setShareTargets] = useState<Map<string, ShareTarget>>(new Map());
  const { grantPermission, isGranting } = useACL();

  // Reset form when dialog opens/closes or document changes
  useEffect(() => {
    if (open && document) {
      setSelectedUserIds([]);
      setDefaultPermission('read');
      setShareTargets(new Map());
    }
  }, [open, document]);

  const handleUserSelection = (userIds: string | string[] | null) => {
    if (!userIds) return;
    const userIdArray = Array.isArray(userIds) ? userIds : userIds ? [userIds] : [];
    setSelectedUserIds(userIdArray);

    // Initialize share targets for new users
    const newTargets = new Map(shareTargets);
    userIdArray.forEach((userId) => {
      if (!newTargets.has(userId)) {
        newTargets.set(userId, {
          userId,
          permissions: [defaultPermission],
        });
      }
    });

    // Remove targets for deselected users
    Array.from(newTargets.keys()).forEach((key) => {
      if (!userIdArray.includes(key)) {
        newTargets.delete(key);
      }
    });

    setShareTargets(newTargets);
  };

  const togglePermission = (userId: string, permission: PermissionLevel) => {
    const newTargets = new Map(shareTargets);
    const target = newTargets.get(userId);
    if (target) {
      const hasPermission = target.permissions.includes(permission);
      const newPermissions = hasPermission
        ? target.permissions.filter((p) => p !== permission)
        : [...target.permissions, permission];
      newTargets.set(userId, { ...target, permissions: newPermissions });
      setShareTargets(newTargets);
    }
  };

  const removeUser = (userId: string) => {
    const newUserIds = selectedUserIds.filter((id) => id !== userId);
    setSelectedUserIds(newUserIds);
    const newTargets = new Map(shareTargets);
    newTargets.delete(userId);
    setShareTargets(newTargets);
  };

  const handleShare = async () => {
    if (!document) return;

    if (shareTargets.size === 0) {
      toast.warning('Please select at least one user to share with');
      return;
    }

    try {
      // Grant permissions for each user
      const promises = Array.from(shareTargets.values()).map((target) =>
        grantPermission({
          shardId: document.id,
          userId: target.userId,
          permissions: target.permissions,
        })
      );

      await Promise.all(promises);

      toast.success(`Document shared with ${shareTargets.size} user(s)`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Share error', 3, {
        errorMessage: errorObj.message,
        documentId: document.id,
      })
    }
  };

  if (!document) return null;

  const permissionLabels: Record<PermissionLevel, string> = {
    read: 'Read',
    write: 'Write',
    delete: 'Delete',
    admin: 'Admin',
  };

  const permissionDescriptions: Record<PermissionLevel, string> = {
    read: 'Can view and download',
    write: 'Can edit metadata',
    delete: 'Can delete document',
    admin: 'Full access including sharing',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Grant access to "{document.name}" for specific users. Select permissions for each user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="users">Select Users</Label>
            <UserPicker
              value={selectedUserIds}
              onChange={handleUserSelection}
              multiple
              placeholder="Search and select users to share with..."
              displayFormat="full"
              showAvatar
            />
            <p className="text-xs text-muted-foreground">
              Select one or more users to grant access to this document
            </p>
          </div>

          {/* Default Permission */}
          {selectedUserIds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="defaultPermission">Default Permission for New Users</Label>
              <Select
                value={defaultPermission}
                onValueChange={(value) => setDefaultPermission(value as PermissionLevel)}
              >
                <SelectTrigger id="defaultPermission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read - View and download</SelectItem>
                  <SelectItem value="write">Write - Edit metadata</SelectItem>
                  <SelectItem value="delete">Delete - Can delete document</SelectItem>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New users will be granted this permission level by default
              </p>
            </div>
          )}

          {/* Permission Settings for Each User */}
          {selectedUserIds.length > 0 && (
            <div className="space-y-4">
              <Label>Permissions for Selected Users</Label>
              <div className="space-y-3">
                {Array.from(shareTargets.entries()).map(([userId, target]) => (
                  <div
                    key={userId}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          User ID: {userId}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUser(userId)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(permissionLabels) as PermissionLevel[]).map((permission) => {
                        const hasPermission = target.permissions.includes(permission);
                        return (
                          <button
                            key={permission}
                            type="button"
                            onClick={() => togglePermission(userId, permission)}
                            className={`flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors ${
                              hasPermission
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                hasPermission
                                  ? 'border-primary bg-primary'
                                  : 'border-gray-300'
                              }`}
                            >
                              {hasPermission && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{permissionLabels[permission]}</div>
                              <div className="text-xs text-muted-foreground">
                                {permissionDescriptions[permission]}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {target.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {target.permissions.map((perm) => (
                          <Badge key={perm} variant="secondary">
                            {permissionLabels[perm]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUserIds.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select users above to configure permissions
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGranting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            disabled={isGranting || shareTargets.size === 0}
          >
            {isGranting ? 'Sharing...' : `Share with ${shareTargets.size} user(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}





