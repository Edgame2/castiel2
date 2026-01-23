"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ArrowLeft,
  Save,
  Plus,
  Settings,
  Trash2,
  GripVertical,
  Eye,
  LayoutDashboard,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDashboard,
  useWidgets,
  useUpdateDashboard,
  useCreateWidget,
  useDeleteWidget,
  useBatchUpdatePositions,
} from "@/hooks/use-dashboards"
import {
  WidgetType,
  type Widget,
  type GridPosition,
  type GridSize,
  type CreateWidgetRequest,
} from "@/types/dashboard"
import { WidgetLibrary, WIDGET_TEMPLATES } from "@/components/dashboards/widget-library"
import { cn } from "@/lib/utils"
import { SortableWidget } from "@/components/dashboards/sortable-widget"

export default function DashboardEditPage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const dashboardId = params.id as string

  // State
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [addWidgetOpen, setAddWidgetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [localLayout, setLocalLayout] = useState<Array<{
    widgetId: string
    position: GridPosition
    size: GridSize
  }>>([])

  // Queries
  const { data: dashboard, isLoading: loadingDashboard } = useDashboard(dashboardId)
  const { data: widgets, isLoading: loadingWidgets } = useWidgets(dashboardId)

  // Mutations
  const updateDashboard = useUpdateDashboard(dashboardId)
  const createWidget = useCreateWidget(dashboardId)
  const deleteWidget = useDeleteWidget(dashboardId)
  const batchUpdatePositions = useBatchUpdatePositions(dashboardId)

  // Initialize local layout from dashboard
  useMemo(() => {
    if (dashboard && localLayout.length === 0) {
      setLocalLayout(dashboard.layout?.desktop || [])
    }
  }, [dashboard, localLayout.length])

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Widget list for sortable context
  const widgetIds = useMemo(() => {
    return localLayout.map(item => item.widgetId)
  }, [localLayout])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveWidgetId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveWidgetId(null)

    if (!over) return

    // Check if dragging from widget catalog (template)
    const activeData = active.data.current
    if (activeData?.type === 'widget-template') {
      // Handle drop from catalog - create new widget
      const widgetData = activeData.widgetData
      const template = WIDGET_TEMPLATES.find(
        t => `widget-template-${t.type}-${t.name.replace(/\s+/g, '-')}` === active.id
      )
      
      if (template) {
        handleAddWidget({
          name: template.name,
          widgetType: template.type,
          dataSource: {
            type: template.predefinedQuery ? 'predefined' : 'custom',
            predefinedQuery: template.predefinedQuery,
            allowUserFilters: true,
          },
          config: template.defaultConfig,
          size: template.defaultSize,
        })
      }
      return
    }

    // Existing reorder logic
    if (active.id === over.id) return

    setLocalLayout((items) => {
      const oldIndex = items.findIndex(item => item.widgetId === active.id)
      const newIndex = items.findIndex(item => item.widgetId === over.id)

      if (oldIndex === -1 || newIndex === -1) return items

      const newItems = arrayMove(items, oldIndex, newIndex)

      // Recalculate positions based on new order
      const gridColumns = dashboard?.gridConfig?.columns?.desktop || 12
      let currentX = 0
      let currentY = 0
      let rowMaxHeight = 0

      return newItems.map((item, index) => {
        const size = item.size

        // Check if widget fits in current row
        if (currentX + size.width > gridColumns) {
          currentX = 0
          currentY += rowMaxHeight
          rowMaxHeight = 0
        }

        const position = { x: currentX, y: currentY }
        currentX += size.width
        rowMaxHeight = Math.max(rowMaxHeight, size.height)

        return { ...item, position }
      })
    })

    setHasChanges(true)
  }, [dashboard?.gridConfig?.columns?.desktop])

  // Handle widget resize
  const handleResize = useCallback((widgetId: string, newSize: GridSize) => {
    setLocalLayout((items) => {
      return items.map(item =>
        item.widgetId === widgetId
          ? { ...item, size: newSize }
          : item
      )
    })
    setHasChanges(true)
  }, [])

  // Handle add widget
  const handleAddWidget = useCallback(async (widgetConfig: Partial<CreateWidgetRequest>) => {
    try {
      // Find next available position
      const gridColumns = dashboard?.gridConfig?.columns?.desktop || 12
      let maxY = 0
      localLayout.forEach(item => {
        maxY = Math.max(maxY, item.position.y + item.size.height)
      })

      const newWidget = await createWidget.mutateAsync({
        dashboardId,
        name: widgetConfig.name || 'New Widget',
        description: widgetConfig.description,
        widgetType: widgetConfig.widgetType || WidgetType.COUNTER,
        dataSource: widgetConfig.dataSource || {
          type: 'predefined',
          predefinedQuery: 'recent_shards',
          allowUserFilters: true,
        },
        config: widgetConfig.config || {},
        position: { x: 0, y: maxY },
        size: widgetConfig.size || { width: 6, height: 4 },
      })

      // Add to local layout
      setLocalLayout(prev => [
        ...prev,
        {
          widgetId: newWidget.id,
          position: { x: 0, y: maxY },
          size: widgetConfig.size || { width: 6, height: 4 },
        }
      ])

      setAddWidgetOpen(false)
      toast.success(t('dashboards:widgetAdded' as any))
    } catch (error) {
      toast.error(t('dashboards:widgetAddError' as any))
    }
  }, [createWidget, dashboard?.gridConfig?.columns?.desktop, dashboardId, localLayout, t])

  // Handle delete widget
  const handleDeleteWidget = useCallback(async (widgetId: string) => {
    try {
      await deleteWidget.mutateAsync(widgetId)
      setLocalLayout(prev => prev.filter(item => item.widgetId !== widgetId))
      setSelectedWidgetId(null)
      toast.success(t('dashboards:widgetDeleted' as any))
    } catch (error) {
      toast.error(t('dashboards:widgetDeleteError' as any))
    }
  }, [deleteWidget, t])

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      // Update widget positions
      await batchUpdatePositions.mutateAsync({
        positions: localLayout.map(item => ({
          widgetId: item.widgetId,
          position: item.position,
          size: item.size,
        })),
      })

      setHasChanges(false)
      toast.success(t('dashboards:saved' as any))
    } catch (error) {
      toast.error(t('dashboards:saveError' as any))
    }
  }, [batchUpdatePositions, localLayout, t])

  // Get active widget for drag overlay
  const activeWidget = useMemo(() => {
    if (!activeWidgetId || !widgets) return null
    return widgets.find(w => w.id === activeWidgetId)
  }, [activeWidgetId, widgets])

  if (loadingDashboard || loadingWidgets) {
    return <EditorSkeleton />
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold">{t('dashboards:notFound.title' as any)}</h2>
        <Button onClick={() => router.push('/dashboards')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('dashboards:backToList' as any)}
        </Button>
      </div>
    )
  }

  const gridConfig = dashboard.gridConfig

  return (
    <div className="flex flex-col h-screen">
      {/* Editor Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboards/${dashboardId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                {t('dashboards:editDashboard' as any)}
                {hasChanges && (
                  <Badge variant="outline" className="text-xs">
                    {t('common:unsavedChanges' as any)}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{dashboard.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboards/${dashboardId}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('dashboards:preview' as any)}
            </Button>

            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('dashboards:settings' as any)}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t('dashboards:dashboardSettings' as any)}</SheetTitle>
                  <SheetDescription>
                    {t('dashboards:settingsDescription' as any)}
                  </SheetDescription>
                </SheetHeader>
                <DashboardSettingsForm
                  dashboard={dashboard}
                  onSave={async (data) => {
                    await updateDashboard.mutateAsync(data)
                    setSettingsOpen(false)
                    toast.success(t('dashboards:settingsSaved' as any))
                  }}
                />
              </SheetContent>
            </Sheet>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || batchUpdatePositions.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {batchUpdatePositions.isPending ? t('common:saving' as any) : t('common:save' as any)}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-muted/30">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
              <div
                className="grid gap-4 min-h-full"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig?.columns?.desktop || 12}, 1fr)`,
                }}
              >
                {localLayout.map((item) => {
                  const widget = widgets?.find(w => w.id === item.widgetId)
                  if (!widget) return null

                  return (
                    <SortableWidget
                      key={item.widgetId}
                      widget={widget}
                      position={item.position}
                      size={item.size}
                      gridColumns={gridConfig?.columns?.desktop || 12}
                      rowHeight={gridConfig?.rowHeight || 60}
                      isSelected={selectedWidgetId === item.widgetId}
                      onSelect={() => setSelectedWidgetId(item.widgetId)}
                      onDelete={() => handleDeleteWidget(item.widgetId)}
                      onResize={(newSize) => handleResize(item.widgetId, newSize)}
                    />
                  )
                })}

                {/* Add Widget Button */}
                <div
                  className="col-span-full flex items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => setAddWidgetOpen(true)}
                >
                  <div className="text-center">
                    <Plus className="h-8 w-8 mx-auto text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mt-2">
                      {t('dashboards:addWidget' as any)}
                    </span>
                  </div>
                </div>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeWidget && (
                <Card className="w-64 h-32 shadow-lg opacity-90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GripVertical className="h-4 w-4" />
                      {activeWidget.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {activeWidget.widgetType}
                  </CardContent>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t('dashboards:addWidget' as any)}</DialogTitle>
            <DialogDescription>
              {t('dashboards:selectWidgetType' as any)} - Drag widgets to the dashboard or click to add
            </DialogDescription>
          </DialogHeader>
          <WidgetLibrary onSelect={handleAddWidget} enableDragAndDrop={true} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface DashboardSettingsFormProps {
  dashboard: {
    name: string
    description?: string
    color?: string
    settings: {
      autoRefresh: boolean
      autoRefreshInterval: number
      theme: string
      density: string
    }
  }
  onSave: (data: Record<string, unknown>) => Promise<void>
}

function DashboardSettingsForm({ dashboard, onSave }: DashboardSettingsFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const [name, setName] = useState(dashboard.name)
  const [description, setDescription] = useState(dashboard.description || '')
  const [color, setColor] = useState(dashboard.color || '#6366f1')
  const [autoRefresh, setAutoRefresh] = useState(dashboard.settings.autoRefresh)
  const [refreshInterval, setRefreshInterval] = useState(
    String(dashboard.settings.autoRefreshInterval)
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave({
        name,
        description,
        color,
        settings: {
          ...dashboard.settings,
          autoRefresh,
          autoRefreshInterval: parseInt(refreshInterval) || 60,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('common:name' as any)}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('common:description' as any)}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">{t('dashboards:color' as any)}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-20 rounded border cursor-pointer"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="autoRefresh">{t('dashboards:autoRefresh' as any)}</Label>
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-4 w-4"
          />
        </div>

        {autoRefresh && (
          <div className="space-y-2">
            <Label htmlFor="refreshInterval">
              {t('dashboards:refreshInterval' as any)} ({t('common:seconds' as any)})
            </Label>
            <Input
              id="refreshInterval"
              type="number"
              min={10}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
            />
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="w-full">
        {saving ? t('common:saving' as any) : t('common:save' as any)}
      </Button>
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-4">
          {[6, 6, 4, 4, 4, 12].map((span, i) => (
            <Skeleton key={i} className={`col-span-${span} h-[200px]`} />
          ))}
        </div>
      </div>
    </div>
  )
}

