"use client"

import Link from "next/link"
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Settings,
  Users,
  BarChart,
  Search,
  Plus,
  Home,
} from "lucide-react"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"

interface QuickLinksWidgetProps {
  widget: Widget
}

interface QuickLink {
  id: string
  label: string
  href: string
  icon?: string
  color?: string
  external?: boolean
}

interface QuickLinksConfig {
  links: QuickLink[]
  layout?: 'grid' | 'list'
}

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  file: FileText,
  folder: FolderOpen,
  settings: Settings,
  users: Users,
  chart: BarChart,
  search: Search,
  plus: Plus,
  home: Home,
  external: ExternalLink,
}

export function QuickLinksWidget({ widget }: QuickLinksWidgetProps) {
  const config = widget.config as unknown as unknown as QuickLinksConfig
  const links = config?.links || []
  const layout = config?.layout || 'grid'

  if (links.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No links configured
      </div>
    )
  }

  if (layout === 'list') {
    return (
      <div className="space-y-1">
        {links.map((link) => {
          const Icon = (ICONS[link.icon || 'file'] || FileText) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
          return (
            <LinkItem key={link.id} link={link} Icon={Icon} layout="list" />
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {links.map((link) => {
        const Icon = (ICONS[link.icon || 'file'] || FileText) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
        return (
          <LinkItem key={link.id} link={link} Icon={Icon} layout="grid" />
        )
      })}
    </div>
  )
}

interface LinkItemProps {
  link: QuickLink
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  layout: 'grid' | 'list'
}

function LinkItem({ link, Icon, layout }: LinkItemProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-accent",
        layout === 'grid' && "flex-col text-center py-4"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded",
          layout === 'grid' ? "h-10 w-10" : "h-8 w-8"
        )}
        style={{ backgroundColor: link.color ? `${link.color}20` : undefined }}
      >
        <Icon
          className={cn(
            layout === 'grid' ? "h-5 w-5" : "h-4 w-4"
          )}
          style={{ color: link.color }}
        />
      </div>
      <span className={cn(
        "text-sm",
        layout === 'list' && "flex-1"
      )}>
        {link.label}
      </span>
      {link.external && layout === 'list' && (
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  )

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={link.href} className="block">
      {content}
    </Link>
  )
}











