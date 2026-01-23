"use client"

import { useState } from "react"
import {
  BarChart3,
  PieChart,
  LineChart,
  Table2,
  List,
  Hash,
  FileText,
  CheckSquare,
  Activity,
  Users,
  Link2,
  Code,
  Gauge,
  Search,
  Kanban,
  Bell,
  ExternalLink,
  Globe,
  Webhook,
  GripVertical,
  Mail,
  Calendar,
  Folder,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDraggable } from "@dnd-kit/core"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WidgetType, type CreateWidgetRequest } from "@/types/dashboard"
import { cn } from "@/lib/utils"
import { DraggableWidgetCard } from "./draggable-widget-card"

interface WidgetLibraryProps {
  onSelect: (config: Partial<CreateWidgetRequest>) => void
  enableDragAndDrop?: boolean
}

interface WidgetTemplate {
  type: WidgetType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'data' | 'shard' | 'user' | 'integration' | 'custom'
  defaultSize: { width: number; height: number }
  defaultConfig: Record<string, unknown>
  predefinedQuery?: string
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // Data Widgets
  {
    type: WidgetType.COUNTER,
    name: 'Counter',
    description: 'Display a single metric with optional trend',
    icon: Hash,
    category: 'data',
    defaultSize: { width: 3, height: 2 },
    defaultConfig: { format: 'number' },
    predefinedQuery: 'shard_count_by_type',
  },
  {
    type: WidgetType.CHART,
    name: 'Bar Chart',
    description: 'Visualize data with vertical bars',
    icon: BarChart3,
    category: 'data',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: { type: 'bar' },
    predefinedQuery: 'shard_count_by_type',
  },
  {
    type: WidgetType.CHART,
    name: 'Pie Chart',
    description: 'Show proportions in a circular chart',
    icon: PieChart,
    category: 'data',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: { type: 'pie' },
    predefinedQuery: 'shard_count_by_status',
  },
  {
    type: WidgetType.CHART,
    name: 'Line Chart',
    description: 'Track trends over time',
    icon: LineChart,
    category: 'data',
    defaultSize: { width: 6, height: 3 },
    defaultConfig: { type: 'line' },
  },
  {
    type: WidgetType.GAUGE,
    name: 'Gauge',
    description: 'Show progress toward a goal',
    icon: Gauge,
    category: 'data',
    defaultSize: { width: 3, height: 3 },
    defaultConfig: { min: 0, max: 100 },
  },
  {
    type: WidgetType.TABLE,
    name: 'Data Table',
    description: 'Display structured data in rows and columns',
    icon: Table2,
    category: 'data',
    defaultSize: { width: 6, height: 5 },
    defaultConfig: {},
    predefinedQuery: 'recent_shards',
  },
  {
    type: WidgetType.LIST,
    name: 'List',
    description: 'Display items in a simple list format',
    icon: List,
    category: 'data',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: { showBadge: true, showMeta: true },
  },

  // Shard Widgets
  {
    type: WidgetType.RECENT_SHARDS,
    name: 'Recent Shards',
    description: 'Show recently created or updated shards',
    icon: FileText,
    category: 'shard',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: {},
    predefinedQuery: 'recent_shards',
  },
  {
    type: WidgetType.SHARD_ACTIVITY,
    name: 'Shard Activity',
    description: 'Track activity across shards',
    icon: Activity,
    category: 'shard',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: {},
    predefinedQuery: 'user_activity_timeline',
  },
  {
    type: WidgetType.SHARD_STATS,
    name: 'Shard Statistics',
    description: 'Overview of shard counts and status',
    icon: BarChart3,
    category: 'shard',
    defaultSize: { width: 6, height: 3 },
    defaultConfig: {},
    predefinedQuery: 'shard_count_by_type',
  },
  {
    type: WidgetType.SHARD_SEARCH,
    name: 'Shard Search',
    description: 'Quick search within shards',
    icon: Search,
    category: 'shard',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: {},
  },
  {
    type: WidgetType.SHARD_KANBAN,
    name: 'Kanban Board',
    description: 'View shards in a kanban-style board',
    icon: Kanban,
    category: 'shard',
    defaultSize: { width: 12, height: 6 },
    defaultConfig: { groupBy: 'status' },
  },

  // User Widgets
  {
    type: WidgetType.MY_TASKS,
    name: 'My Tasks',
    description: 'Your assigned tasks and to-dos',
    icon: CheckSquare,
    category: 'user',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: {},
    predefinedQuery: 'my_tasks',
  },
  {
    type: WidgetType.TEAM_ACTIVITY,
    name: 'Team Activity',
    description: 'Activity feed from your team',
    icon: Users,
    category: 'user',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: {},
    predefinedQuery: 'team_activity_summary',
  },
  {
    type: WidgetType.USER_STATS,
    name: 'User Statistics',
    description: 'Your personal activity stats',
    icon: Activity,
    category: 'user',
    defaultSize: { width: 6, height: 3 },
    defaultConfig: {},
  },
  {
    type: WidgetType.NOTIFICATIONS,
    name: 'Notifications',
    description: 'Your recent notifications',
    icon: Bell,
    category: 'user',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: {},
  },

  // Integration Widgets
  {
    type: WidgetType.EXTERNAL_DATA,
    name: 'External Data',
    description: 'Fetch and display data from external APIs',
    icon: ExternalLink,
    category: 'integration',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: {},
  },
  {
    type: WidgetType.EMBED,
    name: 'Embed',
    description: 'Embed external content via iframe',
    icon: Globe,
    category: 'integration',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: { url: '' },
  },
  {
    type: WidgetType.WEBHOOK_STATUS,
    name: 'Webhook Status',
    description: 'Monitor webhook health and deliveries',
    icon: Webhook,
    category: 'integration',
    defaultSize: { width: 6, height: 3 },
    defaultConfig: {},
  },

  // Google Workspace Widgets
  {
    type: WidgetType.GMAIL_INBOX,
    name: 'Gmail Inbox',
    description: 'Display unread emails from Gmail',
    icon: Mail,
    category: 'integration',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: { integrationId: '', limit: 5 },
  },
  {
    type: WidgetType.CALENDAR_EVENTS,
    name: 'Calendar Events',
    description: 'Show upcoming calendar events',
    icon: Calendar,
    category: 'integration',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: { integrationId: '', limit: 10, days: 7 },
  },
  {
    type: WidgetType.DRIVE_FILES,
    name: 'Drive Files',
    description: 'Recent files from Google Drive',
    icon: Folder,
    category: 'integration',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: { integrationId: '', limit: 10 },
  },
  {
    type: WidgetType.CONTACTS_STATS,
    name: 'Contacts Stats',
    description: 'Google Contacts summary',
    icon: Users,
    category: 'integration',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: { integrationId: '', limit: 5 },
  },
  {
    type: WidgetType.TASKS_SUMMARY,
    name: 'Tasks Summary',
    description: 'Google Tasks overview',
    icon: CheckSquare,
    category: 'integration',
    defaultSize: { width: 4, height: 5 },
    defaultConfig: { integrationId: '', tasklistId: '@default' },
  },

  // Custom Widgets
  {
    type: WidgetType.CUSTOM_QUERY,
    name: 'Custom Query',
    description: 'Build a custom data query',
    icon: Code,
    category: 'custom',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: {},
  },
  {
    type: WidgetType.MARKDOWN,
    name: 'Markdown',
    description: 'Display formatted text and notes',
    icon: FileText,
    category: 'custom',
    defaultSize: { width: 4, height: 3 },
    defaultConfig: { content: '# Welcome\n\nAdd your content here...' },
  },
  {
    type: WidgetType.QUICK_LINKS,
    name: 'Quick Links',
    description: 'Shortcuts to important pages',
    icon: Link2,
    category: 'custom',
    defaultSize: { width: 3, height: 4 },
    defaultConfig: {
      layout: 'grid',
      links: [
        { id: '1', label: 'Dashboard', href: '/dashboard', icon: 'home' },
        { id: '2', label: 'Shards', href: '/shards', icon: 'file' },
        { id: '3', label: 'Settings', href: '/settings', icon: 'settings' },
      ],
    },
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  data: 'Data Visualization',
  shard: 'Shard Widgets',
  user: 'User Widgets',
  integration: 'Integrations',
  custom: 'Custom Widgets',
}

export function WidgetLibrary({ onSelect, enableDragAndDrop = false }: WidgetLibraryProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null)
  const [widgetName, setWidgetName] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('data')

  const categories = ['data', 'shard', 'user', 'integration', 'custom']
  const filteredTemplates = WIDGET_TEMPLATES.filter(
    (template) => template.category === activeCategory
  )

  const handleSelectTemplate = (template: WidgetTemplate) => {
    setSelectedTemplate(template)
    setWidgetName(template.name)
  }

  const handleConfirm = () => {
    if (!selectedTemplate) return

    onSelect({
      name: widgetName || selectedTemplate.name,
      widgetType: selectedTemplate.type,
      dataSource: {
        type: selectedTemplate.predefinedQuery ? 'predefined' : 'custom',
        predefinedQuery: selectedTemplate.predefinedQuery,
        allowUserFilters: true,
      },
      config: selectedTemplate.defaultConfig,
      size: selectedTemplate.defaultSize,
    })
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {CATEGORY_LABELS[cat]}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              {WIDGET_TEMPLATES.filter((t) => t.category === cat).map((template) => {
                const isSelected = selectedTemplate?.type === template.type &&
                  selectedTemplate?.name === template.name
                const widgetId = `widget-template-${template.type}-${template.name.replace(/\s+/g, '-')}`

                return (
                  <DraggableWidgetCard
                    key={widgetId}
                    id={widgetId}
                    name={template.name}
                    description={template.description}
                    icon={template.icon}
                    defaultSize={template.defaultSize}
                    isSelected={isSelected}
                    onClick={() => handleSelectTemplate(template)}
                    draggable={enableDragAndDrop}
                  />
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selectedTemplate && (
        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="widgetName">{t('dashboards:widgetName' as any)}</Label>
            <Input
              id="widgetName"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder={selectedTemplate.name}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              {t('common:cancel' as any)}
            </Button>
            <Button onClick={handleConfirm}>
              {t('dashboards:addWidget' as any)}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export templates for use in dashboard editor
export { WIDGET_TEMPLATES }
export type { WidgetTemplate }
