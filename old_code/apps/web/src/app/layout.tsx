import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { MonitoringProvider } from '@/components/providers/monitoring-provider'
import { RealtimeProvider } from '@/components/providers/realtime-provider'
import { I18nProvider } from '@/components/providers/i18n-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { CookieConsent } from '@/components/cookie-consent'
import { SkipLinks } from '@/components/skip-links'
import './globals.css'

// Optimized font loading with display swap and variable font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME + ' - Enterprise Knowledge Management',
  description: 'B2B SaaS platform for intelligent data management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable}`}>
        <SkipLinks />
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <I18nProvider>
              <QueryProvider>
                <Suspense fallback={null}>
                  <MonitoringProvider>
                    <AuthProvider>
                      <RealtimeProvider>
                        {children}
                        <Toaster />
                        <CookieConsent />
                      </RealtimeProvider>
                    </AuthProvider>
                  </MonitoringProvider>
                </Suspense>
              </QueryProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
