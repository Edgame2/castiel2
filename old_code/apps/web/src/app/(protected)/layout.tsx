'use client'

import { useEffect, useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { CommandPalette, CommandShortcutListener } from '@/components/command-palette'
import { ensureAuth } from '@/lib/api/client'
import { useAuth } from '@/contexts/auth-context'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isLoading: authLoading, isAuthenticated } = useAuth()
    const [apiReady, setApiReady] = useState(false)

    useEffect(() => {
        if (isAuthenticated && !apiReady) {
            ensureAuth().then(() => {
                setApiReady(true)
            })
        }
    }, [isAuthenticated, apiReady])

    // Show loading while auth or API is initializing
    if (authLoading || (isAuthenticated && !apiReady)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <div className="flex flex-1 items-center justify-between">
                        <h1 className="text-lg font-semibold">Castiel</h1>
                        <div className="flex items-center gap-2">
                            {/* Language switcher and other header actions can go here */}
                        </div>
                    </div>
                </header>
                <main 
                    id="main-content" 
                    className="flex-1 overflow-y-auto p-6" 
                    role="main" 
                    aria-label="Main content"
                >
                    {children}
                </main>
            </SidebarInset>
            {/* Global Command Palette */}
            <CommandPalette />
            <CommandShortcutListener />
        </SidebarProvider>
    )
}
