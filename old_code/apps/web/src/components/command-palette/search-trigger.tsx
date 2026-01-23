"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useCommandPaletteStore } from "./command-palette-store"
import { cn } from "@/lib/utils"

interface SearchTriggerProps {
  className?: string
  variant?: "default" | "compact" | "button"
}

/**
 * Search trigger button/input that opens the command palette
 * Can be used in the navbar or anywhere in the app
 */
export function SearchTrigger({ className, variant = "default" }: SearchTriggerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('common')
  const { open } = useCommandPaletteStore()

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={open}
        className={className}
        aria-label={t('commandPalette.open', 'Open command palette')}
      >
        <Search className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === "compact") {
    return (
      <button
        onClick={open}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border bg-muted/50 hover:bg-muted transition-colors",
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">
          {t('commandPalette.search', 'Search')}
        </span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    )
  }

  // Default variant - looks like a search input
  return (
    <button
      onClick={open}
      className={cn(
        "flex items-center gap-3 w-full max-w-sm h-10 px-4 text-sm text-muted-foreground rounded-lg border bg-background hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">
        {t('commandPalette.placeholder', 'Type a command or search...')}
      </span>
      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}

