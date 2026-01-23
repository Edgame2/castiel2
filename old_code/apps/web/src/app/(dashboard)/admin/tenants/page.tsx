'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/widgets/data-table/data-table'
import { useTenants, useUpdateTenant, useDeleteTenant, useActivateTenant } from '@/hooks/use-tenants'
import { createColumns, TenantActionsProps } from './columns'
import { CreateTenantDialog } from '@/components/tenants/create-tenant-dialog'
import { Tenant, TenantListQuery } from '@/lib/api/tenants'
import { Loader2 } from 'lucide-react'
import { trackTrace } from '@/lib/monitoring/app-insights'

export default function TenantManagementPage() {
    const { t } = useTranslation(['tenants', 'common'])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    })

    // Convert table pagination to API query
    const query: TenantListQuery = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    }

    const { data, isLoading } = useTenants(query)
    const updateTenantMutation = useUpdateTenant()
    const deleteTenantMutation = useDeleteTenant()
    const activateTenantMutation = useActivateTenant()

    const handleEdit = (tenant: Tenant) => {
        // TODO: Implement edit dialog or navigation
        // For now just log, or maybe navigate to detail page
        trackTrace('Edit tenant clicked', 1, {
            tenantId: tenant.id,
            tenantName: tenant.name,
        })
    }

    const handleDeactivate = (id: string) => {
        if (confirm(t('common:confirmDelete' as any, 'Are you sure you want to deactivate this tenant?'))) {
            deleteTenantMutation.mutate(id)
        }
    }

    const handleActivate = (id: string) => {
        activateTenantMutation.mutate(id)
    }

    const columns = createColumns({
        onEdit: handleEdit,
        onDeactivate: handleDeactivate,
        onActivate: handleActivate,
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('tenants:title', 'Tenants')}</h2>
                    <p className="text-muted-foreground">
                        {t('tenants:description', 'Manage system tenants and organizations.')}
                    </p>
                </div>
                <CreateTenantDialog />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('tenants:listTitle', 'All Tenants')}</CardTitle>
                    <CardDescription>
                        {t('tenants:listDescription', 'View and manage all registered tenants.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <DataTable
                            data={data?.tenants || []}
                            columns={columns}
                            totalCount={data?.total || 0}
                            serverSide={true}
                            config={{
                                defaultPageSize: pagination.pageSize,
                            }}
                            state={{
                                pagination,
                            }}
                            callbacks={{
                                onPageChange: (pageIndex, pageSize) => {
                                    setPagination({ pageIndex, pageSize });
                                },
                            }}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
