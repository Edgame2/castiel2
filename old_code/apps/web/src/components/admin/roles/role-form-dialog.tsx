'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useCreateRole, useUpdateRole, useRole, usePermissions } from '@/hooks/use-roles';
import { useTenant } from '@/hooks/use-tenant'; // Only if needed for debugging
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }).regex(/^[a-z0-9_-]+$/, {
        message: "Name can only contain lowercase letters, numbers, underscores, and hyphens."
    }),
    displayName: z.string().min(2, {
        message: "Display name must be at least 2 characters.",
    }),
    description: z.string().optional(),
    permissions: z.array(z.string()).refine((value) => value.length > 0, {
        message: "You must select at least one permission.",
    }),
});

interface RoleFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roleId?: string;
}

export function RoleFormDialog({ open, onOpenChange, roleId }: RoleFormDialogProps) {
    const { t } = useTranslation('users');
    const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissions();
    const { data: roleData, isLoading: isLoadingRole } = useRole(roleId || '');
    const createRole = useCreateRole();
    const updateRole = useUpdateRole(roleId || '');

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            displayName: '',
            description: '',
            permissions: [],
        },
    });

    // Load role data when editing
    useEffect(() => {
        if (roleId && roleData) {
            form.reset({
                name: roleData.name,
                displayName: roleData.displayName,
                description: roleData.description || '',
                permissions: roleData.permissions,
            });
        } else if (!roleId) {
            form.reset({
                name: '',
                displayName: '',
                description: '',
                permissions: [],
            });
        }
    }, [roleId, roleData, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (roleId) {
                await updateRole.mutateAsync(values);
            } else {
                await createRole.mutateAsync(values);
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace('Failed to submit role', 3, {
                errorMessage: errorObj.message,
                mode: roleId ? 'edit' : 'create',
                roleId,
            })
        }
    };

    const isSubmitting = createRole.isPending || updateRole.isPending;
    const isLoading = isLoadingPermissions || (!!roleId && isLoadingRole);

    const categories = permissionsData?.categories || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{roleId ? t('roles.edit', 'Edit Role') : t('roles.create', 'Create Role')}</DialogTitle>
                    <DialogDescription>
                        {t('roles.formDescription', 'Define the role details and assign specific permissions.')}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('roles.displayName', 'Display Name')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Content Editor" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('roles.name', 'Unique Name (ID)')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. content_editor"
                                                    {...field}
                                                    disabled={!!roleId} // Cannot change ID after creation
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t('roles.nameHint', 'Used in code. Immutable.')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('roles.description', 'Description')}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t('roles.descPlaceholder', 'Describe what this role is for...')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {t('roles.permissions', 'Permissions')}
                                </h3>
                                <div className="border rounded-md">
                                    <Accordion type="single" collapsible className="w-full">
                                        {categories.map((category, index) => (
                                            <AccordionItem key={category.name} value={`item-${index}`}>
                                                <AccordionTrigger className="px-4 hover:no-underline">
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="font-medium">{category.name}</span>
                                                        <span className="text-xs text-muted-foreground font-normal">{category.description}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-4 pb-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                        {category.permissions.map((permission) => (
                                                            <FormField
                                                                key={permission.id}
                                                                control={form.control}
                                                                name="permissions"
                                                                render={({ field }) => {
                                                                    return (
                                                                        <FormItem
                                                                            key={permission.id}
                                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={(field.value || []).includes(permission.id)}
                                                                                    onCheckedChange={(checked) => {
                                                                                        return checked
                                                                                            ? field.onChange([...(field.value || []), permission.id])
                                                                                            : field.onChange(
                                                                                                (field.value || []).filter(
                                                                                                    (value: string) => value !== permission.id
                                                                                                )
                                                                                            )
                                                                                    }}
                                                                                />
                                                                            </FormControl>
                                                                            <div className="space-y-1 leading-none">
                                                                                <FormLabel className="font-normal cursor-pointer text-sm">
                                                                                    {permission.name}
                                                                                </FormLabel>
                                                                                <FormDescription className="text-xs">
                                                                                    {permission.description}
                                                                                </FormDescription>
                                                                            </div>
                                                                        </FormItem>
                                                                    )
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                                {form.formState.errors.permissions && (
                                    <p className="text-[0.8rem] font-medium text-destructive">
                                        {form.formState.errors.permissions.message}
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    {t('common.cancel', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {roleId ? t('common.save', 'Save Changes') : t('common.create', 'Create Role')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
