"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AuditLogsView from '@/components/audit/audit-logs-viewer'
import { Phase2AuditTrailViewer } from '@/components/audit/phase2-audit-trail-viewer'
import { useAuth } from "@/contexts/auth-context"

export default function AuditLogsPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('tenant-admin') || user?.roles?.includes('super-admin')

  return (
    <div className="space-y-6 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          View system audit logs and shard-specific audit trails
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Audit Logs</TabsTrigger>
          {isAdmin && <TabsTrigger value="phase2">Phase 2 Audit Trail</TabsTrigger>}
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <AuditLogsView />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="phase2" className="space-y-4">
            <Phase2AuditTrailViewer />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
