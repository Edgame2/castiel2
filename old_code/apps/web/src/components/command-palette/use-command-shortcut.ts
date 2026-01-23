"use client"

import { useEffect } from 'react'
import { useCommandPaletteStore } from './command-palette-store'

/**
 * Hook to register global keyboard shortcut for command palette
 * Ctrl+K / Cmd+K opens the command palette
 */
export function useCommandShortcut() {
  const { toggle, open } = useCommandPaletteStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
        return
      }

      // "/" to focus search (when not in an input)
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault()
        open()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle, open])
}

/**
 * Component that registers the keyboard shortcut
 * Include this in your root layout
 */
export function CommandShortcutListener() {
  useCommandShortcut()
  return null
}











