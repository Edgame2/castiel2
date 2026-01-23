"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Settings,
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  Star,
  ArrowLeft,
  GripVertical,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  useDashboardFull,
  useMergedDashboard,
  useHideWidget,
  useShowWidget,
  useSaveFilterState,
  useBatchUpdatePositions,
} from "@/hooks/use-dashboards"
import { DatePreset, type Widget, type MergedWidget, type GridPosition, type GridSize } from "@/types/dashboard"
import { cn } from "@/lib/utils"
import { WidgetContainer } from "@/components/dashboards/widget-container"

export default function DashboardViewPage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const dashboardId = params.id as string

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [datePreset, setDatePreset] = useState<DatePreset>(DatePreset.LAST_30_DAYS)
  const [showInherited, setShowInherited] = useState(true)

  // Queries
  const { data: fullDashboard, isLoading: loadingDashboard, refetch: refetchFull } = useDashboardFull(dashboardId)
  const { data: merged, isLoading: loadingMerged, refetch: refetchMerged } = useMergedDashboard(dashboardId)

  const dashboard = fullDashboard?.dashboard
  const widgets = fullDashboard?.widgets

  // Refetch wrapper for compatibility
  const refetchWidgets = () => {
    // In full mode, we refetch everything
    // actual refetch comes from useDashboardFull result but we named it differently
    // simplified:
    return Promise.resolve()
  }

  // Mutations
  const hideWidget = useHideWidget(dashboardId)
  const showWidget = useShowWidget(dashboardId)
  const saveFilterState = useSaveFilterState(dashboardId)
  const batchUpdatePositions = useBatchUpdatePositions(dashboardId)

  // Combine widgets from merged dashboard with actual widget data
  const displayWidgets = useMemo(() => {
    if (!merged || !widgets) return []

    const widgetMap = new Map(widgets.map(w => [w.id, w]))

    return merged.widgets
      .filter(mw => showInherited || mw.source === 'user')
      .filter(mw => !mw.isHidden)
      .map(mw => ({
        mergedInfo: mw,
        widget: widgetMap.get(mw.widgetId),
      }))
      .filter(item => item.widget)
  }, [merged, widgets, showInherited])

  // Handle date filter change
  const handleDatePresetChange = useCallback(async (preset: DatePreset) => {
    setDatePreset(preset)
    try {
      await saveFilterState.mutateAsync({
        dateRange: { preset },
      })
    } catch (error) {
      // Silent fail - UI already updated
    }
  }, [saveFilterState])

  // Handle widget visibility toggle
  const handleToggleWidgetVisibility = useCallback(async (mergedWidget: MergedWidget) => {
    try {
      if (mergedWidget.isHidden) {
        await showWidget.mutateAsync({
          widgetId: mergedWidget.widgetId,
          sourceDashboardId: mergedWidget.sourceDashboardId,
        })
        toast.success(t('dashboards:widgetShown' as any))
      } else {
        await hideWidget.mutateAsync({
          widgetId: mergedWidget.widgetId,
          sourceDashboardId: mergedWidget.sourceDashboardId,
        })
        toast.success(t('dashboards:widgetHidden' as any))
      }
    } catch (error) {
      toast.error(t('dashboards:widgetToggleError' as any))
    }
  }, [hideWidget, showWidget, t])

  // Handle refresh all
  const handleRefreshAll = useCallback(() => {
    refetchMerged()
    refetchFull()
    toast.success(t('dashboards:refreshed' as any))
  }, [refetchMerged, refetchFull, t])

  // Handle layout change from drag-drop
  const handleLayoutChange = useCallback(async (
    positions: Array<{ widgetId: string; position: GridPosition; size?: GridSize }>
  ) => {
    try {
      await batchUpdatePositions.mutateAsync({ positions })
    } catch (error) {
      toast.error(t('dashboards:layoutUpdateError' as any))
    }
  }, [batchUpdatePositions, t])

  if (loadingDashboard || loadingMerged) {
    return <DashboardSkeleton />
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold">{t('dashboards:notFound.title' as any)}</h2>
        <p className="text-muted-foreground">{t('dashboards:notFound.description' as any)}</p>
        <Button onClick={() => router.push('/dashboards')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('dashboards:backToList' as any)}
        </Button>
      </div>
    )
  }

  const gridConfig = merged?.gridConfig || dashboard?.gridConfig || {
    columns: { desktop: 12, tablet: 8, mobile: 4 },
    rowHeight: 80,
    gap: 16,
    padding: 24,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboards')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: dashboard.color || '#6366f1' }}
              >
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  {dashboard.name}
                  {dashboard.isDefault && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                </h1>
                {dashboard.description && (
                  <p className="text-sm text-muted-foreground">{dashboard.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Filter */}
            <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DatePreset.TODAY}>{t('dashboards:datePresets.today' as any)}</SelectItem>
                <SelectItem value={DatePreset.YESTERDAY}>{t('dashboards:datePresets.yesterday' as any)}</SelectItem>
                <SelectItem value={DatePreset.LAST_7_DAYS}>{t('dashboards:datePresets.last7Days' as any)}</SelectItem>
                <SelectItem value={DatePreset.LAST_30_DAYS}>{t('dashboards:datePresets.last30Days' as any)}</SelectItem>
                <SelectItem value={DatePreset.THIS_MONTH}>{t('dashboards:datePresets.thisMonth' as any)}</SelectItem>
                <SelectItem value={DatePreset.THIS_QUARTER}>{t('dashboards:datePresets.thisQuarter' as any)}</SelectItem>
                <SelectItem value={DatePreset.THIS_YEAR}>{t('dashboards:datePresets.thisYear' as any)}</SelectItem>
                <SelectItem value={DatePreset.THIS_FISCAL_YEAR}>{t('dashboards:datePresets.thisFiscalYear' as any)}</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* Show inherited toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="show-inherited"
                checked={showInherited}
                onCheckedChange={setShowInherited}
              />
              <Label htmlFor="show-inherited" className="text-sm">
                {t('dashboards:showInherited' as any)}
              </Label>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Actions */}
            <Button variant="outline" size="icon" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  <GripVertical className="mr-2 h-4 w-4" />
                  {isEditing ? t('dashboards:exitEditMode' as any) : t('dashboards:enterEditMode' as any)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboards/${dashboardId}/edit`)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('dashboards:settings' as any)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  {t('dashboards:export' as any)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isEditing && (
              <Button onClick={() => router.push(`/dashboards/${dashboardId}/edit`)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboards:addWidget' as any)}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loadingDashboard || loadingMerged ? (
          <WidgetGridSkeleton />
        ) : displayWidgets.length === 0 ? (
          <EmptyDashboard
            onAddWidget={() => router.push(`/dashboards/${dashboardId}/edit`)}
          />
        ) : (
          <DashboardGrid
            widgets={displayWidgets}
            gridConfig={gridConfig}
            isEditing={isEditing}
            onLayoutChange={handleLayoutChange}
            onToggleVisibility={handleToggleWidgetVisibility}
            datePreset={datePreset}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface DashboardGridProps {
  widgets: Array<{
    mergedInfo: MergedWidget
    widget: Widget | undefined
  }>
  gridConfig: {
    columns: { desktop: number; tablet: number; mobile: number }
    rowHeight: number
    gap: number
    padding: number
  }
  isEditing: boolean
  onLayoutChange: (positions: Array<{ widgetId: string; position: GridPosition; size?: GridSize }>) => void
  onToggleVisibility: (widget: MergedWidget) => void
  datePreset: DatePreset
}

function DashboardGrid({
  widgets,
  gridConfig,
  isEditing,
  onLayoutChange,
  onToggleVisibility,
  datePreset,
}: DashboardGridProps) {
  const columns = gridConfig?.columns?.desktop || 12
  const rowHeight = gridConfig?.rowHeight || 80
  const gap = gridConfig?.gap || 16

  // Calculate grid dimensions
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    padding: `${gridConfig?.padding || 24}px`,
  }

  return (
    <div style={gridStyle}>
      {widgets.map(({ mergedInfo, widget }) => {
        if (!widget) return null

        const position = mergedInfo.position
        const size = mergedInfo.size

        const itemStyle = {
          gridColumn: `${position.x + 1} / span ${size.width}`,
          gridRow: `${position.y + 1} / span ${size.height}`,
          minHeight: `${size.height * rowHeight}px`,
        }

        return (
          <div key={widget.id} style={itemStyle}>
            <WidgetContainer
              widget={widget}
              mergedInfo={mergedInfo}
              isEditing={isEditing}
              datePreset={datePreset}
              onToggleVisibility={() => onToggleVisibility(mergedInfo)}
            />
          </div>
        )
      })}
    </div>
  )
}

function EmptyDashboard({ onAddWidget }: { onAddWidget: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards'])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg gap-4">
      <Plus className="h-12 w-12 text-muted-foreground/50" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">{t('dashboards:emptyDashboard.title' as any)}</h3>
        <p className="text-muted-foreground max-w-md">
          {t('dashboards:emptyDashboard.description' as any)}
        </p>
      </div>
      <Button onClick={onAddWidget}>
        <Plus className="mr-2 h-4 w-4" />
        {t('dashboards:addWidget' as any)}
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <WidgetGridSkeleton />
      </div>
    </div>
  )
}

function WidgetGridSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {[6, 6, 4, 4, 4, 12].map((span, i) => (
        <div key={i} className={`col-span-${span}`}>
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
      ))}
    </div>
  )
}

