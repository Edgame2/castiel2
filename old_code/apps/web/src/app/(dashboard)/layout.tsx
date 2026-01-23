import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main id="main-content" className="flex-1 overflow-y-auto bg-muted/10 p-6" role="main" aria-label="Main content">
          {children}
        </main>
      </div>
    </div>
  )
}
