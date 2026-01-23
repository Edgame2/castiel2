'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { SearchTrigger } from '@/components/command-palette'
import { NotificationPanel } from '@/components/notifications'
import { useNotifications } from '@/hooks/use-notifications'

export function TopNav() {
  const { theme, setTheme } = useTheme()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ autoFetch: true })

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <div className="flex flex-1 items-center gap-4">
        {/* Command Palette Search Trigger */}
        <SearchTrigger className="flex-1 max-w-md" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
        />
      </div>
    </header>
  )
}
