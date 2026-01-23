"use client"

import { ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"

interface ListWidgetProps {
  widget: Widget
  data: unknown
}

interface ListItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  icon?: string
  color?: string
  href?: string
  meta?: string
}

interface ListConfig {
  showBadge?: boolean
  showMeta?: boolean
  clickable?: boolean
}

export function ListWidget({ widget, data }: ListWidgetProps) {
  const config = widget.config as ListConfig
  const items: ListItem[] = Array.isArray(data) ? data : []

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No items
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {items.map((item) => (
          <ListItemRow
            key={item.id}
            item={item}
            config={config}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function ListItemRow({ item, config }: { item: ListItem; config?: ListConfig }) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-md transition-colors",
        config?.clickable && "hover:bg-accent cursor-pointer"
      )}
    >
      {item.color && (
        <div
          className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-medium"
          style={{ backgroundColor: item.color }}
        >
          {item.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.title}</span>
          {config?.showBadge && item.badge && (
            <Badge variant={item.badgeVariant || 'outline'} className="text-xs">
              {item.badge}
            </Badge>
          )}
        </div>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
      </div>
      {config?.showMeta && item.meta && (
        <span className="text-xs text-muted-foreground">{item.meta}</span>
      )}
      {config?.clickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )

  if (item.href) {
    return (
      <a href={item.href} className="block">
        {content}
      </a>
    )
  }

  return content
}











