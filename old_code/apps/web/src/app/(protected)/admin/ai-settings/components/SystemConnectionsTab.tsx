/**
 * System Connections Tab
 * Manages system-wide AI connections with Key Vault integration
 * Now displays connections and navigates to dedicated pages for create/edit
 */

import Link from 'next/link'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Zap,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSystemConnections,
  useDeleteSystemConnection,
  useAIModelsCatalog,
  useTestSystemConnection,
  useToggleSystemConnectionStatus,
} from '@/hooks/use-ai-settings'
import type { AIConnection } from '@/lib/api/ai-settings'
import { useState } from 'react'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type ConnectionTestResult = {
  success: boolean
  message: string
  latency?: number
  modelType?: string
  provider?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  testedAt: string
}

const formatUsage = (usage?: ConnectionTestResult['usage']) => {
  if (!usage) return ''
  const parts: string[] = []
  if (usage.promptTokens !== undefined) parts.push(`prompt=${usage.promptTokens}`)
  if (usage.completionTokens !== undefined) parts.push(`completion=${usage.completionTokens}`)
  if (usage.totalTokens !== undefined) parts.push(`total=${usage.totalTokens}`)
  return parts.join(', ')
}

const formatLatency = (latency?: number) => (latency !== undefined ? `${latency}ms` : 'unknown')

export function SystemConnectionsTab() {
  const [deleteDialog, setDeleteDialog] = useState<AIConnection | null>(null)
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({})

  const { data, isLoading } = useSystemConnections()
  const { data: catalogData } = useAIModelsCatalog()
  const deleteMutation = useDeleteSystemConnection()
  const testMutation = useTestSystemConnection()
  const toggleStatusMutation = useToggleSystemConnectionStatus()

  const connections = data?.connections || []
  const models = catalogData?.models || []

  // Helper to get model name from modelId
  const getModelName = (modelId: string) => {
    const model = models.find((m) => m.id === modelId)
    return model?.name || modelId
  }

  const handleDelete = async (connection: AIConnection) => {
    await deleteMutation.mutateAsync(connection.id)
    setDeleteDialog(null)
  }

  const handleToggleStatus = async (connection: AIConnection) => {
    await toggleStatusMutation.mutateAsync(connection.id)
  }

  const handleTest = async (connection: AIConnection) => {
    setTestingConnectionId(connection.id)
    try {
      const result = await testMutation.mutateAsync(connection.id)
      setTestResults((prev) => ({
        ...prev,
        [connection.id]: {
          ...result,
          testedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Connection test failed', 3, {
        errorMessage: errorObj.message,
        connectionId: connection.id,
      })
    } finally {
      setTestingConnectionId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System Connections</CardTitle>
            <CardDescription>
              Configure system-wide connections with API keys stored in Azure Key Vault
            </CardDescription>
          </div>
          <Link href="/admin/ai/connections/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No system connections configured yet.</p>
              <p className="text-sm mt-2">
                Add your first connection to make AI models available system-wide.
              </p>
              <Link href="/admin/ai/connections/new" className="mt-4 inline-block">
                <Button size="sm" variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Connection
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Last Test</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">{connection.name}</TableCell>
                    <TableCell>{getModelName(connection.modelId)}</TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {testingConnectionId === connection.id ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Testing...</span>
                        </div>
                      ) : testResults[connection.id] ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {testResults[connection.id].success ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Badge
                              variant="outline"
                              className={
                                testResults[connection.id].success
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-destructive/40 bg-destructive/5 text-destructive'
                              }
                            >
                              {testResults[connection.id].success ? 'Pass' : 'Fail'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatLatency(testResults[connection.id].latency)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testResults[connection.id].message}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            [{testResults[connection.id].modelType || 'unknown'} • {testResults[connection.id].provider || 'unknown'}]
                          </div>
                          {testResults[connection.id].usage && (
                            <div className="text-[11px] text-muted-foreground">
                              Usage: {formatUsage(testResults[connection.id].usage)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not tested</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {connection.endpoint || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {false ? (
                          <>
                            <Key className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-600">Env Var</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600">Key Vault</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {connection.isDefaultModel ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(connection)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {connection.status === 'active' ? (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Disable
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4 text-gray-400" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTest(connection)}
                              disabled={testingConnectionId === connection.id}
                            >
                              <Zap className="mr-2 h-4 w-4" />
                              {testingConnectionId === connection.id ? 'Testing...' : 'Test'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/ai/connections/${connection.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog(connection)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Info Banner */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Key className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Secure Credential Storage</p>
              <p className="text-blue-700 mt-1">
                API keys are stored in Azure Key Vault and never displayed after initial entry.
                Only the secret ID reference is stored in the database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection "{deleteDialog?.name}" and its credentials from Key Vault.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
