"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Home,
  Sparkles,
  FileText,
  Layers,
  LayoutDashboard,
  Search,
  Link2,
  Users,
  Mail,
  Zap,
  ScrollText,
  Monitor,
  UserCircle,
  Building2,
  Settings,
  Shield,
  FolderPlus,
  FolderOpen,
  ShieldCheck,
  Lightbulb,
  Bell,
  TrendingUp,
  Target,
  BarChart3,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Database,
  Globe,
  Webhook,
  Code,
  FileUp,
  FileDown,
  Trash2,
  UserCog,
  UsersRound,
  Brain,
  Activity,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TenantSwitcher } from "@/components/tenant-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { t } = useTranslation('nav')

  // Check user roles - handle all variations
  const role = user?.role?.toLowerCase();
  const roles = user?.roles?.map(r => r.toLowerCase()) || [];

  const isSuperAdmin = role === 'super-admin' || role === 'super_admin' || role === 'superadmin' ||
    roles.includes('super-admin') || roles.includes('super_admin') || roles.includes('superadmin');

  const isAdmin = isSuperAdmin ||
    role === 'admin' || role === 'owner' || role === 'tenant_admin' ||
    roles.includes('admin') || roles.includes('owner') || roles.includes('tenant_admin')

  const isManager = role === 'manager' || roles.includes('manager')

  // Build navigation based on user permissions
  const navMain = [
    {
      title: t('main' as any) || 'Main',
      items: [
        {
          title: t('dashboard' as any),
          url: "/dashboard",
          icon: Home,
        },
        {
          title: t('aiChat' as any),
          url: "/chat",
          icon: Sparkles,
        },
        {
          title: t('shards' as any),
          url: "/shards",
          icon: FileText,
        },
      ],
    },
    {
      title: t('projects' as any) || 'Projects',
      items: [
        {
          title: t('projectsList' as any),
          url: "/projects",
          icon: FolderOpen,
        },
        {
          title: t('createProject' as any),
          url: "/projects/new",
          icon: FolderPlus,
        },
      ],
    },
    {
      title: t('contentManagement' as any) || 'Content Management',
      items: [
        {
          title: t('shardTypes' as any),
          url: "/shard-types",
          icon: Layers,
        },
        {
          title: t('dashboards' as any),
          url: "/dashboards",
          icon: LayoutDashboard,
        },
        {
          title: t('search' as any),
          url: "/search",
          icon: Search,
        },
        {
          title: t('sharedInsights' as any) || 'Shared Insights',
          url: "/insights",
          icon: Lightbulb,
        },
        {
          title: t('proactiveInsights' as any) || 'Proactive Insights',
          url: "/proactive-insights",
          icon: Bell,
        },
        {
          title: t('collections' as any) || 'Collections',
          url: "/collections",
          icon: Database,
        },
        {
          title: t('documents' as any) || 'Documents',
          url: "/documents",
          icon: BookOpen,
        },
        {
          title: t('templates' as any) || 'Templates',
          url: "/templates",
          icon: FileText,
        },
        {
          title: t('contentGeneration' as any) || 'Content Generation',
          url: "/content-generation",
          icon: Zap,
        },
        {
          title: t('webSearch' as any) || 'Web Search',
          url: "/web-search",
          icon: Globe,
        },
      ],
    },
    {
      title: t('revenueIntelligence' as any) || 'Revenue Intelligence',
      items: [
        ...(isManager ? [{
          title: t('managerDashboard' as any) || 'Manager Dashboard',
          url: "/manager",
          icon: UserCog,
        }] : []),
        {
          title: t('opportunities' as any) || 'Opportunities',
          url: "/opportunities",
          icon: Briefcase,
        },
        {
          title: t('pipeline' as any) || 'Pipeline',
          url: "/pipeline",
          icon: BarChart3,
        },
        {
          title: t('quotas' as any) || 'Quotas',
          url: "/quotas",
          icon: TrendingUp,
        },
        {
          title: t('benchmarks' as any) || 'Benchmarks',
          url: "/benchmarks",
          icon: BarChart3,
        },
        {
          title: t('analytics' as any) || 'Analytics',
          url: "/analytics/ai",
          icon: TrendingUp,
        },
      ],
    },
    {
      title: t('riskManagement' as any) || 'Risk Management',
      items: [
        {
          title: t('riskCatalog' as any) || 'Risk Catalog',
          url: "/risk-analysis/catalog",
          icon: Shield,
        },
      ],
    },
    {
      title: t('cais' as any) || 'Compound AI Systems',
      items: [
        {
          title: t('caisDashboard' as any) || 'CAIS Dashboard',
          url: "/cais",
          icon: Brain,
        },
        {
          title: t('pipelineHealth' as any) || 'Pipeline Health',
          url: "/cais/pipeline-health",
          icon: Activity,
        },
        {
          title: t('forecastAnalysis' as any) || 'Forecast Analysis',
          url: "/cais/forecast",
          icon: TrendingUp,
        },
        {
          title: t('playbooks' as any) || 'Playbooks',
          url: "/cais/playbooks",
          icon: Zap,
        },
      ],
    },
  ]

  // Add administration section for admins
  if (isAdmin || isSuperAdmin) {
    navMain.push({
      title: t('administration' as any) || 'Administration',
      items: [
        {
          title: t('users' as any),
          url: "/users",
          icon: Users,
        },
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('teams' as any) || 'Teams',
          url: "/teams",
          icon: UsersRound,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('invitations' as any),
          url: "/users/invitations",
          icon: Mail,
        }] : []),
        {
          title: t('enrichment' as any),
          url: "/enrichment",
          icon: Zap,
        },
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('integrations' as any),
          url: "/integrations",
          icon: Link2,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('auditLogs' as any),
          url: "/audit",
          icon: ScrollText,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('roles' as any) || 'Roles',
          url: "/admin/roles",
          icon: ShieldCheck,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('proactiveTriggers' as any) || 'Proactive Triggers',
          url: "/proactive-triggers",
          icon: Zap,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('webhooks' as any) || 'Webhooks',
          url: "/admin/webhooks",
          icon: Webhook,
        }] : []),
        ...((isAdmin || isSuperAdmin) ? [{
          title: t('developerApps' as any) || 'Developer Apps',
          url: "/developer/apps",
          icon: Code,
        }] : []),
        ...(isSuperAdmin ? [{
          title: t('promptABTests' as any) || 'Prompt A/B Tests',
          url: "/admin/ai-settings/prompt-ab-tests",
          icon: TrendingUp,
        },
        {
          title: t('contextTemplates', 'Context Templates'),
          url: "/admin/ai-settings/context-templates",
          icon: FileText,
        },
        {
          title: t('aiSettings' as any) || 'AI Settings',
          url: "/admin/ai-settings",
          icon: Sparkles,
        },
        {
          title: t('emailTemplates' as any) || 'Email Templates',
          url: "/admin/email-templates",
          icon: Mail,
        },
        {
          title: t('documentSettings' as any) || 'Document Settings',
          url: "/admin/document-settings",
          icon: FileText,
        },
        {
          title: t('widgets' as any) || 'Widgets',
          url: "/admin/widgets",
          icon: LayoutDashboard,
        }] : []),
      ],
    })
  }

  // Add notifications section (for all users)
  navMain.push({
    title: t('notifications' as any) || 'Notifications',
    items: [
      {
        title: t('notifications' as any) || 'Notifications',
        url: "/notifications",
        icon: Bell,
      },
    ],
  })

  // Add user section
  navMain.push({
    title: t('account' as any) || 'Account',
    items: [
      {
        title: t('profile' as any),
        url: "/profile",
        icon: UserCircle,
      },
      {
        title: t('settings' as any),
        url: "/settings",
        icon: Settings,
      },
      {
        title: t('aiSettings' as any) || 'AI Settings',
        url: "/settings/ai",
        icon: Sparkles,
      },
      {
        title: t('sessions' as any),
        url: "/account/sessions",
        icon: Monitor,
      },
      {
        title: t('dataExport' as any) || 'Data Export',
        url: "/settings/data-export",
        icon: FileDown,
      },
      {
        title: t('dataDeletion' as any) || 'Data Deletion',
        url: "/settings/data-deletion",
        icon: Trash2,
      },
    ],
  })

  // Add Super Admin section
  if (isSuperAdmin) {
    navMain.push({
      title: t('superAdmin' as any),
      items: [
        {
          title: t('tenants' as any),
          url: "/tenants",
          icon: Building2,
        },
        {
          title: t('systemAdmin' as any),
          url: "/admin",
          icon: Shield,
        },
      ],
    })
  }

  const userData = user ? {
    name: user.name || user.email || 'User',
    email: user.email || '',
    avatar: '', // Placeholder for now
  } : {
    name: 'Guest',
    email: '',
    avatar: '',
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
