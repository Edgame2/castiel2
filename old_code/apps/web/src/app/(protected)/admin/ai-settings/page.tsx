'use client'

/**
 * AI Settings Admin Page (Two-Part System)
 * Super Admin page for managing AI model catalog and system connections
 * 
 * Two-Part Architecture:
 * 1. Models Catalog: Defines available AI models (name, capabilities, provider)
 * 2. Connections: System-wide credentials and endpoints for models
 */

import { useState } from 'react'
import {
  Sparkles,
  Plus,
  Database,
  Plug,
  BarChart3,
  Shield,
  Key,
  Cpu,
  ListChecks,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAIModelsCatalog,
  useSystemConnections,
  useAIUsageStats,
} from '@/hooks/use-ai-settings'
import { ModelsCatalogTab } from './components/ModelsCatalogTab'
import { SystemConnectionsTab } from './components/SystemConnectionsTab'
import { UsageStatsTab } from './components/UsageStatsTab'
import { ModelSelectionConfigTab } from './components/ModelSelectionConfigTab'
import { AIToolsTab } from './components/AIToolsTab'
import Link from 'next/link'

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState('catalog')

  // Fetch data for overview
  const { data: catalogData } = useAIModelsCatalog()
  const { data: connectionsData } = useSystemConnections()
  const { data: usageData } = useAIUsageStats({ period: 'month' })

  const catalogCount = catalogData?.models?.length || 0
  const connectionsCount = connectionsData?.connections?.length || 0
  const totalUsage = usageData?.totalTokens || 0

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage AI model catalog and system-wide connections
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Models in Catalog</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{catalogCount}</div>
            <p className="text-xs text-muted-foreground">
              Available AI models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Connections</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectionsCount}</div>
            <p className="text-xs text-muted-foreground">
              Configured endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Vault</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Secure</div>
            <p className="text-xs text-muted-foreground">
              Credentials protected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsage > 0 ? `${(totalUsage / 1000000).toFixed(1)}M` : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" className="gap-2">
            <Database className="h-4 w-4" />
            Models Catalog
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-2">
            <Plug className="h-4 w-4" />
            System Connections
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage & Analytics
          </TabsTrigger>
          <TabsTrigger value="model-selection" className="gap-2">
            <Cpu className="h-4 w-4" />
            Model Selection
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            AI Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <ModelsCatalogTab />
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <SystemConnectionsTab />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageStatsTab />
        </TabsContent>

        <TabsContent value="model-selection" className="space-y-4">
          <ModelSelectionConfigTab />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <AIToolsTab />
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Security Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            All API keys are securely stored in Azure Key Vault. Keys are never displayed after initial entry.
            Connections reference the secret ID, and credentials are fetched at runtime.
          </p>
        </CardContent>
      </Card>

      {/* Quick Access: Embedding Management */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Embedding Templates
            </CardTitle>
            <CardDescription>Manage tenant-specific embedding templates for shard types.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/ai-settings/embedding-templates" className="inline-flex">
              <Button variant="secondary">Open Embedding Templates</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Embedding Jobs
            </CardTitle>
            <CardDescription>Monitor and manage embedding generation jobs for shards.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/ai-settings/embedding-jobs" className="inline-flex">
              <Button variant="secondary">Open Embedding Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}





