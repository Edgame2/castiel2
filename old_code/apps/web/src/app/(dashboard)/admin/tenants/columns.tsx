'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Tenant, TenantStatus, TenantPlan } from '@/lib/api/tenants'
import { DataTableColumnHeader } from '@/components/widgets/data-table/data-table-column-header'

export type TenantActionsProps = {
    tenant: Tenant
    onEdit: (tenant: Tenant) => void
    onDeactivate: (id: string) => void
    onActivate: (id: string) => void
}

const TenantActions = ({ tenant, onEdit, onDeactivate, onActivate }: TenantActionsProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tenant.id)}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(tenant)}>
                    Edit Tenant
                </DropdownMenuItem>

                {tenant.status !== 'suspended' && (
                    <DropdownMenuItem onClick={() => onDeactivate(tenant.id)} className="text-red-600 focus:text-red-600">
                        Deactivate
                    </DropdownMenuItem>
                )}

                {tenant.status === 'suspended' && (
                    <DropdownMenuItem onClick={() => onActivate(tenant.id)} className="text-green-600 focus:text-green-600">
                        Activate
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const StatusBadge = ({ status }: { status: TenantStatus }) => {
    switch (status) {
        case 'active':
            return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
        case 'suspended':
            return <Badge variant="destructive">Suspended</Badge>
        case 'pending':
            return <Badge variant="secondary">Pending</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

const PlanBadge = ({ plan }: { plan: TenantPlan }) => {
    switch (plan) {
        case 'enterprise':
            return <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400">Enterprise</Badge>
        case 'pro':
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">Pro</Badge>
        default:
            return <Badge variant="outline">Free</Badge>
    }
}

export const createColumns = (
    actions: Omit<TenantActionsProps, 'tenant'>
): ColumnDef<Tenant>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
        },
        {
            accessorKey: 'domain',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Domain" />
            ),
            cell: ({ row }) => {
                const domain = row.getValue('domain') as string
                return domain ? (
                    <a
                        href={`https://${domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-600 dark:text-blue-400"
                    >
                        {domain}
                    </a>
                ) : <span className="text-muted-foreground">-</span>
            }
        },
        {
            accessorKey: 'plan',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Plan" />
            ),
            cell: ({ row }) => <PlanBadge plan={row.getValue('plan')} />,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: 'users',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Users" />
            ),
            cell: ({ row }) => {
                // Assuming we might have user count in future, placeholder for now
                return <span className="text-muted-foreground">-</span>
            }
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Created" />
            ),
            cell: ({ row }) => {
                return new Date(row.getValue('createdAt')).toLocaleDateString()
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <TenantActions
                    tenant={row.original}
                    onEdit={actions.onEdit}
                    onDeactivate={actions.onDeactivate}
                    onActivate={actions.onActivate}
                />
            ),
        },
    ]
