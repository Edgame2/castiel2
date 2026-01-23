"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, LayoutDashboard, Star, Copy, Trash2, MoreHorizontal, Settings, Eye } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDashboards,
  useCreateDashboard,
  useDeleteDashboard,
  useDuplicateDashboard,
  useSetDefaultDashboard,
  useTenantDashboardConfig,
} from "@/hooks/use-dashboards"
import { DashboardType, DashboardStatus, type Dashboard } from "@/types/dashboard"
import { cn } from "@/lib/utils"

import { useAuth } from "@/contexts/auth-context"

export default function DashboardsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const [activeTab, setActiveTab] = useState<'my' | 'tenant' | 'templates'>('my')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null)
  const [newDashboardName, setNewDashboardName] = useState("")
  const [duplicateName, setDuplicateName] = useState("")

  // Queries - only enable when authenticated and on respective tabs
  const isReady = isAuthenticated && !authLoading
  const { data: config } = useTenantDashboardConfig(isReady)
  const { data: myDashboards, isLoading: loadingMy } = useDashboards({ 
    dashboardType: DashboardType.USER 
  }, isReady && activeTab === 'my')
  const { data: tenantDashboards, isLoading: loadingTenant } = useDashboards({ 
    dashboardType: DashboardType.TENANT 
  }, isReady && activeTab === 'tenant')
  const { data: templates, isLoading: loadingTemplates } = useDashboards({ 
    isTemplate: true 
  }, isReady && activeTab === 'templates')

  // Mutations
  const createDashboard = useCreateDashboard()
  const deleteDashboard = useDeleteDashboard()
  const duplicateDashboard = useDuplicateDashboard()
  const setDefaultDashboard = useSetDefaultDashboard()

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return

    try {
      const dashboard = await createDashboard.mutateAsync({
        name: newDashboardName,
        dashboardType: DashboardType.USER,
      })
      toast.success(t('dashboards:createSuccess' as any))
      setCreateDialogOpen(false)
      setNewDashboardName("")
      router.push(`/dashboards/${dashboard.id}`)
    } catch (error) {
      toast.error(t('dashboards:createError' as any))
    }
  }

  const handleDuplicateDashboard = async () => {
    if (!selectedDashboard || !duplicateName.trim()) return

    try {
      const dashboard = await duplicateDashboard.mutateAsync({
        id: selectedDashboard.id,
        newName: duplicateName,
      })
      toast.success(t('dashboards:duplicateSuccess' as any))
      setDuplicateDialogOpen(false)
      setDuplicateName("")
      setSelectedDashboard(null)
      router.push(`/dashboards/${dashboard.id}`)
    } catch (error) {
      toast.error(t('dashboards:duplicateError' as any))
    }
  }

  const handleDeleteDashboard = async () => {
    if (!selectedDashboard) return

    try {
      await deleteDashboard.mutateAsync(selectedDashboard.id)
      toast.success(t('dashboards:deleteSuccess' as any))
      setDeleteDialogOpen(false)
      setSelectedDashboard(null)
    } catch (error) {
      toast.error(t('dashboards:deleteError' as any))
    }
  }

  const handleSetDefault = async (dashboard: Dashboard) => {
    try {
      await setDefaultDashboard.mutateAsync(dashboard.id)
      toast.success(t('dashboards:setDefaultSuccess' as any))
    } catch (error) {
      toast.error(t('dashboards:setDefaultError' as any))
    }
  }

  const openDuplicateDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard)
    setDuplicateName(`${dashboard.name} (Copy)`)
    setDuplicateDialogOpen(true)
  }

  const openDeleteDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard)
    setDeleteDialogOpen(true)
  }

  // Check if dashboards are enabled
  if (config && !config.dashboardsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LayoutDashboard className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-semibold">{t('dashboards:disabled.title' as any)}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('dashboards:disabled.description' as any)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboards:title' as any)}</h1>
          <p className="text-muted-foreground">
            {t('dashboards:description' as any)}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('dashboards:create' as any)}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="my">
            {t('dashboards:tabs.my' as any)}
            {myDashboards && (
              <Badge variant="secondary" className="ml-2">
                {myDashboards.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tenant">
            {t('dashboards:tabs.tenant' as any)}
            {tenantDashboards && (
              <Badge variant="secondary" className="ml-2">
                {tenantDashboards.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t('dashboards:tabs.templates' as any)}
            {templates && (
              <Badge variant="secondary" className="ml-2">
                {templates.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Dashboards */}
        <TabsContent value="my" className="mt-6">
          {loadingMy ? (
            <DashboardGridSkeleton />
          ) : myDashboards?.dashboards.length === 0 ? (
            <EmptyState
              title={t('dashboards:empty.my.title' as any)}
              description={t('dashboards:empty.my.description' as any)}
              action={
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('dashboards:create' as any)}
                </Button>
              }
            />
          ) : (
            <DashboardGrid
              dashboards={myDashboards?.dashboards || []}
              onView={(d) => router.push(`/dashboards/${d.id}`)}
              onEdit={(d) => router.push(`/dashboards/${d.id}/edit`)}
              onDuplicate={openDuplicateDialog}
              onDelete={openDeleteDialog}
              onSetDefault={handleSetDefault}
              canEdit
              canDelete
            />
          )}
        </TabsContent>

        {/* Tenant Dashboards */}
        <TabsContent value="tenant" className="mt-6">
          {loadingTenant ? (
            <DashboardGridSkeleton />
          ) : tenantDashboards?.dashboards.length === 0 ? (
            <EmptyState
              title={t('dashboards:empty.tenant.title' as any)}
              description={t('dashboards:empty.tenant.description' as any)}
            />
          ) : (
            <DashboardGrid
              dashboards={tenantDashboards?.dashboards || []}
              onView={(d) => router.push(`/dashboards/${d.id}`)}
              onDuplicate={openDuplicateDialog}
              canEdit={false}
              canDelete={false}
            />
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-6">
          {loadingTemplates ? (
            <DashboardGridSkeleton />
          ) : templates?.dashboards.length === 0 ? (
            <EmptyState
              title={t('dashboards:empty.templates.title' as any)}
              description={t('dashboards:empty.templates.description' as any)}
            />
          ) : (
            <DashboardGrid
              dashboards={templates?.dashboards || []}
              onView={(d) => router.push(`/dashboards/${d.id}`)}
              onDuplicate={openDuplicateDialog}
              canEdit={false}
              canDelete={false}
              showUseTemplate
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboards:createDialog.title' as any)}</DialogTitle>
            <DialogDescription>
              {t('dashboards:createDialog.description' as any)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('common:name' as any)}</Label>
              <Input
                id="name"
                placeholder={t('dashboards:createDialog.namePlaceholder' as any)}
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDashboard()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('common:cancel' as any)}
            </Button>
            <Button 
              onClick={handleCreateDashboard}
              disabled={!newDashboardName.trim() || createDashboard.isPending}
            >
              {createDashboard.isPending ? t('common:creating' as any) : t('common:create' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboards:duplicateDialog.title' as any)}</DialogTitle>
            <DialogDescription>
              {t('dashboards:duplicateDialog.description' as any)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicateName">{t('common:name' as any)}</Label>
              <Input
                id="duplicateName"
                placeholder={t('dashboards:duplicateDialog.namePlaceholder' as any)}
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDuplicateDashboard()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              {t('common:cancel' as any)}
            </Button>
            <Button 
              onClick={handleDuplicateDashboard}
              disabled={!duplicateName.trim() || duplicateDashboard.isPending}
            >
              {duplicateDashboard.isPending ? t('common:duplicating' as any) : t('common:duplicate' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboards:deleteDialog.title' as any)}</DialogTitle>
            <DialogDescription>
              {t('dashboards:deleteDialog.description', { name: selectedDashboard?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common:cancel' as any)}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteDashboard}
              disabled={deleteDashboard.isPending}
            >
              {deleteDashboard.isPending ? t('common:deleting' as any) : t('common:delete' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface DashboardGridProps {
  dashboards: Dashboard[]
  onView: (dashboard: Dashboard) => void
  onEdit?: (dashboard: Dashboard) => void
  onDuplicate: (dashboard: Dashboard) => void
  onDelete?: (dashboard: Dashboard) => void
  onSetDefault?: (dashboard: Dashboard) => void
  canEdit?: boolean
  canDelete?: boolean
  showUseTemplate?: boolean
}

function DashboardGrid({
  dashboards,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
  canEdit,
  canDelete,
  showUseTemplate,
}: DashboardGridProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {dashboards.map((dashboard) => (
        <Card
          key={dashboard.id}
          className={cn(
            "group cursor-pointer transition-all hover:shadow-md",
            dashboard.isDefault && "ring-2 ring-primary"
          )}
          onClick={() => onView(dashboard)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: dashboard.color || '#6366f1' }}
                >
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {dashboard.name}
                    {dashboard.isDefault && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(dashboard.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onView(dashboard)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t('common:view' as any)}
                  </DropdownMenuItem>
                  {canEdit && onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(dashboard)}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t('common:edit' as any)}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDuplicate(dashboard)}>
                    <Copy className="mr-2 h-4 w-4" />
                    {showUseTemplate ? t('dashboards:useTemplate' as any) : t('common:duplicate' as any)}
                  </DropdownMenuItem>
                  {onSetDefault && !dashboard.isDefault && (
                    <DropdownMenuItem onClick={() => onSetDefault(dashboard)}>
                      <Star className="mr-2 h-4 w-4" />
                      {t('dashboards:setDefault' as any)}
                    </DropdownMenuItem>
                  )}
                  {canDelete && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(dashboard)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common:delete' as any)}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {dashboard.description || t('dashboards:noDescription' as any)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={dashboard.status === DashboardStatus.ACTIVE ? 'default' : 'secondary'}>
                {dashboard.status}
              </Badge>
              {dashboard.isTemplate && (
                <Badge variant="outline">{t('dashboards:template' as any)}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DashboardGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-2 mt-3">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <LayoutDashboard className="h-12 w-12 text-muted-foreground/50" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-md">{description}</p>
      </div>
      {action}
    </div>
  )
}

