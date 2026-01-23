"use client"

import { useState, useCallback, useMemo } from "react"
import {
  RefreshCw,
  MoreHorizontal,
  Eye,
  EyeOff,
  Settings,
  Download,
  Maximize2,
  GripVertical,
  AlertCircle,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useWidgetData, useRefreshWidgetData } from "@/hooks/use-dashboards"
import {
  WidgetType,
  DatePreset,
  type Widget,
  type MergedWidget,
  type WidgetData,
} from "@/types/dashboard"
import { cn } from "@/lib/utils"

// New widget-compatible components from @/components/widgets
import { StatCounter } from "@/components/widgets/counters"
import { BarChart, PieChart, LineChart } from "@/components/widgets/charts"
import { ActivityFeed, GenericList } from "@/components/widgets/lists"

// Legacy widget renderers (to be migrated)
import { TableWidget } from "./widgets/table-widget"
import { MarkdownWidget } from "./widgets/markdown-widget"
import { QuickLinksWidget } from "./widgets/quick-links-widget"
import { RecentShardsWidget } from "./widgets/recent-shards-widget"
import { MyTasksWidget } from "./widgets/my-tasks-widget"

// Google Workspace widgets
import { GmailInboxWidget } from "./widgets/gmail-inbox-widget"
import { CalendarEventsWidget } from "./widgets/calendar-events-widget"
import { DriveFilesWidget } from "./widgets/drive-files-widget"
import { ContactsStatsWidget } from "./widgets/contacts-stats-widget"
import { TasksSummaryWidget } from "./widgets/tasks-summary-widget"

// Integration widgets
import { IntegrationStatusWidget } from "./widgets/integration-status-widget"
import { IntegrationActivityWidget } from "./widgets/integration-activity-widget"
import { IntegrationSearchWidget } from "./widgets/integration-search-widget"
import { DocumentPreviewWidget } from "./widgets/document-preview-widget"

interface WidgetContainerProps {
  widget: Widget
  mergedInfo: MergedWidget
  isEditing: boolean
  datePreset: DatePreset
  onToggleVisibility: () => void
  initialData?: WidgetData
}

export function WidgetContainer({
  widget,
  mergedInfo,
  isEditing,
  datePreset,
  onToggleVisibility,
  initialData,
}: WidgetContainerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch widget data
  const { data: widgetData, isLoading, error, refetch } = useWidgetData(
    widget.id,
    { dateRange: { preset: datePreset } },
    {
      enabled: true,
      initialData,
      refetchInterval: widget.refreshInterval ? widget.refreshInterval * 1000 : false,
    }
  )
  const refreshWidget = useRefreshWidgetData(widget.id)

  const handleRefresh = useCallback(async () => {
    await refreshWidget.mutateAsync({ dateRange: { preset: datePreset } })
  }, [refreshWidget, datePreset])

  const isRefreshing = refreshWidget.isPending || isLoading

  // Build widget context for widget-compatible components
  const widgetContext = useMemo(() => ({
    dateRange: { preset: datePreset },
    widgetId: widget.id,
    widgetType: widget.widgetType,
  }), [datePreset, widget.id, widget.widgetType])

  // Determine which widget component to render
  const renderWidgetContent = () => {
    if (isLoading) {
      return <WidgetLoadingSkeleton type={widget.widgetType} />
    }

    if (error || widgetData?.error) {
      return (
        <WidgetError
          message={widgetData?.error?.message || (error as Error)?.message || t('dashboards:widgetError' as any)}
          onRetry={handleRefresh}
        />
      )
    }

    const data = widgetData?.data
    const config = widget.config as Record<string, unknown>

    switch (widget.widgetType) {
      case WidgetType.COUNTER:
        // Use new widget-compatible StatCounter
        return (
          <StatCounter
            data={{
              value: (data as { value?: number })?.value ?? 0,
              previousValue: (data as { previousValue?: number })?.previousValue,
              label: config?.label as string,
            }}
            config={{
              format: config?.format as 'number' | 'currency' | 'percentage' | 'compact',
              currency: config?.currency as string,
              decimals: config?.decimals as number,
              showTrend: config?.showTrend as boolean ?? true,
            }}
            onRefresh={handleRefresh}
            widgetContext={widgetContext}
          />
        )

      case WidgetType.CHART:
        // Use new widget-compatible charts based on chart type
        const chartType = config?.type as string || 'bar'
        const chartData = Array.isArray(data) ? data.map((item: unknown) => {
          const d = item as Record<string, unknown>
          return {
            label: (d.label || d.name || d.type || 'Item') as string,
            value: (d.value || d.count || 0) as number,
            color: d.color as string | undefined,
          }
        }) : []

        if (chartType === 'pie' || chartType === 'donut') {
          return (
            <PieChart
              data={chartData}
              config={{
                donut: chartType === 'donut',
                showLegend: true,
                colors: config?.colors as string[],
              }}
              onRefresh={handleRefresh}
              widgetContext={widgetContext}
            />
          )
        }
        if (chartType === 'line' || chartType === 'area') {
          return (
            <LineChart
              data={chartData}
              config={{
                showArea: chartType === 'area',
                curved: true,
                colors: config?.colors as string[],
              }}
              onRefresh={handleRefresh}
              widgetContext={widgetContext}
            />
          )
        }
        // Default to bar chart
        return (
          <BarChart
            data={chartData}
            config={{
              orientation: config?.orientation as 'vertical' | 'horizontal',
              showDataLabels: true,
              colors: config?.colors as string[],
            }}
            onRefresh={handleRefresh}
            widgetContext={widgetContext}
          />
        )

      case WidgetType.TABLE:
        return <TableWidget widget={widget} data={data} />

      case WidgetType.LIST:
        // Use new widget-compatible GenericList
        const listData = Array.isArray(data) ? data.map((item: unknown) => {
          const d = item as Record<string, unknown>
          return {
            id: (d.id || String(Math.random())) as string,
            title: (d.title || d.name || 'Item') as string,
            subtitle: d.subtitle as string | undefined,
            description: d.description as string | undefined,
            href: d.href as string | undefined,
            badge: d.badge as string | undefined,
            timestamp: d.timestamp as string | undefined,
          }
        }) : []

        return (
          <GenericList
            data={listData}
            config={{
              showTimestamps: config?.showTimestamps as boolean,
              selectable: false,
            }}
            onRefresh={handleRefresh}
            widgetContext={widgetContext}
          />
        )

      case WidgetType.RECENT_SHARDS:
        return <RecentShardsWidget widget={widget} data={data} />

      case WidgetType.MY_TASKS:
        return <MyTasksWidget widget={widget} data={data} />

      case WidgetType.TEAM_ACTIVITY:
      case WidgetType.SHARD_ACTIVITY:
        // Use new widget-compatible ActivityFeed
        const activityData = Array.isArray(data) ? data.map((item: unknown) => {
          const d = item as Record<string, unknown>
          return {
            id: (d.id || String(Math.random())) as string,
            action: (d.action || 'view') as string,
            entityId: d.shardId as string | undefined,
            entityType: d.shardTypeId as string | undefined,
            entityName: d.shardName as string | undefined,
            entityLink: d.shardId ? `/shards/${d.shardId}` : undefined,
            userId: d.userId as string | undefined,
            userName: d.userName as string | undefined,
            timestamp: (d.timestamp || new Date().toISOString()) as string,
          }
        }) : []

        return (
          <ActivityFeed
            data={activityData}
            config={{
              showAvatars: true,
              showTimestamps: true,
              showIcons: true,
              maxItems: config?.maxItems as number || 10,
            }}
            onRefresh={handleRefresh}
            widgetContext={widgetContext}
          />
        )

      case WidgetType.MARKDOWN:
        return <MarkdownWidget widget={widget} />

      case WidgetType.QUICK_LINKS:
        return <QuickLinksWidget widget={widget} />

      // Google Workspace Widgets
      case WidgetType.GMAIL_INBOX:
        return <GmailInboxWidget widget={widget} data={data} />

      case WidgetType.CALENDAR_EVENTS:
        return <CalendarEventsWidget widget={widget} data={data} />

      case WidgetType.DRIVE_FILES:
        return <DriveFilesWidget widget={widget} data={data} />

      case WidgetType.CONTACTS_STATS:
        return <ContactsStatsWidget widget={widget} data={data} />

      case WidgetType.TASKS_SUMMARY:
        return <TasksSummaryWidget widget={widget} data={data} />

      // Integration Widgets
      case WidgetType.INTEGRATION_STATUS:
        return <IntegrationStatusWidget widget={widget} data={data} />

      case WidgetType.INTEGRATION_ACTIVITY:
        return <IntegrationActivityWidget widget={widget} data={data} />

      case WidgetType.INTEGRATION_SEARCH:
        return <IntegrationSearchWidget widget={widget} data={data} />

      case WidgetType.DOCUMENT_PREVIEW:
        return <DocumentPreviewWidget widget={widget} widgetContext={widgetContext} />

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('dashboards:widgetTypeNotSupported', { type: widget.widgetType })}
          </div>
        )
    }
  }

  return (
    <Card
      className={cn(
        "h-full flex flex-col transition-all",
        isEditing && "ring-2 ring-primary/20 cursor-move",
        mergedInfo.source !== 'user' && "opacity-90"
      )}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            )}
            <CardTitle className="text-sm font-medium">{widget.name}</CardTitle>
            {mergedInfo.source !== 'user' && (
              <Badge variant="outline" className="text-xs">
                {mergedInfo.source === 'system' ? t('dashboards:systemWidget' as any) : t('dashboards:tenantWidget' as any)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsExpanded(true)}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  {t('dashboards:expand' as any)}
                </DropdownMenuItem>
                {(widget.permissions?.actions ?? { canExport: false }).canExport && (
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    {t('common:export' as any)}
                  </DropdownMenuItem>
                )}
                {mergedInfo.canHide && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onToggleVisibility}>
                      {mergedInfo.isHidden ? (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('dashboards:showWidget' as any)}
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          {t('dashboards:hideWidget' as any)}
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {mergedInfo.canEdit && (
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('dashboards:configureWidget' as any)}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {widget.description && (
          <p className="text-xs text-muted-foreground">{widget.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pt-2">
        {renderWidgetContent()}
      </CardContent>
      {widgetData?.metadata?.lastRefreshedAt && (
        <div className="px-4 pb-2 text-xs text-muted-foreground">
          {t('dashboards:lastUpdated', {
            time: new Date(widgetData.metadata.lastRefreshedAt).toLocaleTimeString(),
          })}
          {widgetData.metadata.cacheHit && (
            <Badge variant="outline" className="ml-2 text-xs">
              {t('dashboards:cached' as any)}
            </Badge>
          )}
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function WidgetLoadingSkeleton({ type }: { type: WidgetType }) {
  switch (type) {
    case WidgetType.COUNTER:
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      )

    case WidgetType.CHART:
      return (
        <div className="h-full w-full flex items-end justify-around gap-2 pb-4">
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <Skeleton key={i} className="w-8" style={{ height: `${h}%` }} />
          ))}
        </div>
      )

    case WidgetType.TABLE:
    case WidgetType.LIST:
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )

    default:
      return (
        <div className="h-full w-full flex items-center justify-center">
          <Skeleton className="h-3/4 w-3/4 rounded" />
        </div>
      )
  }
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards'])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        {t('dashboards:retry' as any)}
      </Button>
    </div>
  )
}

