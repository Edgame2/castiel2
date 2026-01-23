'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RoleFormDialog } from '@/components/admin/roles/role-form-dialog';
import { useRoles, useDeleteRole } from '@/hooks/use-roles';
import { format } from 'date-fns';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function RolesPage() {
    const { t } = useTranslation('users');
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [deletingRole, setDeletingRole] = useState<string | null>(null);

    const { data, isLoading } = useRoles({ search });
    const deleteRole = useDeleteRole();
    const canCreateRole = usePermissionCheck(SYSTEM_PERMISSIONS.ROLES.CREATE);
    const canUpdateRole = usePermissionCheck(SYSTEM_PERMISSIONS.ROLES.UPDATE);
    const canDeleteRole = usePermissionCheck(SYSTEM_PERMISSIONS.ROLES.DELETE);

    const handleDelete = async () => {
        if (deletingRole) {
            await deleteRole.mutateAsync(deletingRole);
            setDeletingRole(null);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('roles.title', 'Roles & Permissions')}</h1>
                    <p className="text-muted-foreground">{t('roles.subtitle', 'Manage user roles and access capabilities.')}</p>
                </div>
                {canCreateRole && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('roles.create', 'Create Role')}
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('roles.search', 'Search roles...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('roles.name', 'Name')}</TableHead>
                            <TableHead>{t('roles.members', 'Members')}</TableHead>
                            <TableHead>{t('roles.status', 'Type')}</TableHead>
                            <TableHead>{t('roles.updated', 'Last Updated')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {t('common.loading', 'Loading...')}
                                </TableCell>
                            </TableRow>
                        ) : data?.roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {t('roles.empty', 'No roles found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{role.displayName}</span>
                                            <span className="text-sm text-muted-foreground">{role.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{role.memberCount || 0}</TableCell>
                                    <TableCell>
                                        {role.isSystem ? (
                                            <Badge variant="secondary">System</Badge>
                                        ) : (
                                            <Badge variant="outline">Custom</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{format(new Date(role.updatedAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {canUpdateRole && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingRole(role.id)}
                                                >
                                                    {t('common.edit', 'Edit')}
                                                </Button>
                                            )}
                                            {canDeleteRole && !role.isSystem && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setDeletingRole(role.id)}
                                                >
                                                    {t('common.delete', 'Delete')}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <RoleFormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />

            {editingRole && (
                <RoleFormDialog
                    open={!!editingRole}
                    onOpenChange={(open) => !open && setEditingRole(null)}
                    roleId={editingRole}
                />
            )}

            <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('roles.deleteTitle', 'Delete Role?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('roles.deleteConfirm', 'This action cannot be undone. Users with this role will lose these permissions.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {t('common.delete', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
