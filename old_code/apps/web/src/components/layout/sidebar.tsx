'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Home, FileText, Layers, Settings, Menu, X, LogOut, Search, Users, Shield, Zap, ScrollText, Monitor, Building2, UserCircle, Mail, Sparkles, Link2, LayoutDashboard, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { TenantSwitcher } from './tenant-switcher'
import { LanguageSwitcher } from './language-switcher'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// Navigation items with translation keys
const navigation = [
  { nameKey: 'dashboard', href: '/dashboard', icon: Home },
  { nameKey: 'aiChat', href: '/chat', icon: Sparkles },
  { nameKey: 'shards', href: '/shards', icon: FileText },
  { nameKey: 'shardTypes', href: '/shard-types', icon: Layers },
  { nameKey: 'dashboards', href: '/dashboards', icon: LayoutDashboard },
  { nameKey: 'opportunities', href: '/opportunities', icon: Target },
  { nameKey: 'pipeline', href: '/pipeline', icon: BarChart3 },
  { nameKey: 'search', href: '/search', icon: Search },
  { nameKey: 'integrations', href: '/integrations', icon: Link2, adminOnly: true },
  { nameKey: 'users', href: '/users', icon: Users },
  { nameKey: 'invitations', href: '/users/invitations', icon: Mail, adminOnly: true },
  { nameKey: 'enrichment', href: '/enrichment', icon: Zap },
  { nameKey: 'auditLogs', href: '/audit', icon: ScrollText, adminOnly: true },
  { nameKey: 'sessions', href: '/account/sessions', icon: Monitor },
  { nameKey: 'profile', href: '/profile', icon: UserCircle },
  { nameKey: 'tenants', href: '/tenants', icon: Building2, superAdminOnly: true },
  { nameKey: 'settings', href: '/settings', icon: Settings },
  { nameKey: 'superAdmin', href: '/admin', icon: Shield, superAdminOnly: true },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { t } = useTranslation(['nav', 'auth'])

  return (
    <aside
      id="navigation"
      aria-label="Main navigation"
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        {!collapsed && <span className="text-xl font-bold">Castiel</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Tenant Switcher */}
      <div className="shrink-0 border-b p-3">
        <TenantSwitcher collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation menu">
        {navigation
          .filter((item) => {
            // Helper function to check if user is super admin (handles all variations)
            const isSuperAdmin = () => {
              const role = user?.role?.toLowerCase();
              const roles = user?.roles?.map(r => r.toLowerCase()) || [];
              return role === 'super-admin' || role === 'super_admin' || role === 'superadmin' ||
                     roles.includes('super-admin') || roles.includes('super_admin') || roles.includes('superadmin');
            };
            
            // Helper function to check if user is admin (includes tenant admin)
            const isAdmin = () => {
              const role = user?.role?.toLowerCase();
              const roles = user?.roles?.map(r => r.toLowerCase()) || [];
              return isSuperAdmin() ||
                     role === 'admin' || role === 'owner' || role === 'tenant_admin' ||
                     roles.includes('admin') || roles.includes('owner') || roles.includes('tenant_admin');
            };
            
            // Check super admin only items
            if (item.superAdminOnly) {
              return isSuperAdmin();
            }
            // Check admin only items
            if ((item as any).adminOnly) {
              return isAdmin();
            }
            // All other items are visible to everyone
            return true;
          })
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const name = t(`nav:${item.nameKey}` as any)

            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Navigate to ${name}`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{name}</span>}
              </Link>
            )
          })}
      </nav>

      <div className="shrink-0 border-t p-4">
        {/* Language Switcher */}
        <div className={cn('mb-3', collapsed ? 'flex justify-center' : '')}>
          <LanguageSwitcher showLabel={!collapsed} />
        </div>

        <div className="flex items-center gap-3" role="complementary" aria-label="User profile">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label={`${user?.name || 'User'} avatar`}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await logout()
            } catch (error) {
              const errorObj = error instanceof Error ? error : new Error(String(error))
              trackException(errorObj, 3)
              trackTrace('Logout failed in sidebar', 3, {
                errorMessage: errorObj.message,
              })
              // Still redirect to login on error
              window.location.href = '/login'
            }
          }}
          className={cn(
            'mt-2 w-full',
            collapsed ? 'justify-center px-2' : 'justify-start'
          )}
          aria-label="Logout from your account"
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} aria-hidden="true" />
          {!collapsed && t('auth:logout.button' as any)}
        </Button>
      </div>
    </aside>
  )
}
