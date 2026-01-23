'use client'

/**
 * System Connections List Page
 * Displays all system-wide AI connections with management options
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Star,
    Shield,
    Key,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Plug,
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
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type ConnectionTestResult = {
    success: boolean
    message: string
    latency?: number
    endpoint?: string
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

export default function SystemConnectionsPage() {
    const router = useRouter()
    const [deleteDialog, setDeleteDialog] = useState<AIConnection | null>(null)
    const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({})

    const { data, isLoading, refetch } = useSystemConnections()
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

    // Helper to get model type and provider
    const getModelInfo = (modelId: string) => {
        const model = models.find((m) => m.id === modelId)
        if (!model) return { type: 'Unknown', provider: 'Unknown' }
        return { type: model.type, provider: model.provider }
    }

    const handleDelete = async (connection: AIConnection) => {
        await deleteMutation.mutateAsync(connection.id)
        setDeleteDialog(null)
        refetch()
    }

    const handleToggleStatus = async (connection: AIConnection) => {
        await toggleStatusMutation.mutateAsync(connection.id)
        refetch()
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
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">System Connections</h2>
                        <p className="text-muted-foreground">
                            Configure system-wide AI connections with API keys stored in Azure Key Vault
                        </p>
                    </div>
                </div>
                <Link href="/admin/ai/connections/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Connection
                    </Button>
                </Link>
            </div>

            {/* Connections Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Connections</CardTitle>
                    <CardDescription>
                        {connections.length} connection{connections.length !== 1 ? 's' : ''} configured
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {connections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">No connections yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create your first system connection to get started
                            </p>
                            <Link href="/admin/ai/connections/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Connection
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Last Test</TableHead>
                                        <TableHead>Endpoint</TableHead>
                                        <TableHead>Credential</TableHead>
                                        <TableHead className="w-[60px]">Default</TableHead>
                                        <TableHead className="w-[60px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {connections.map((connection) => {
                                        const modelInfo = getModelInfo(connection.modelId)
                                        const credentialType = 'Key Vault'

                                        return (
                                            <TableRow key={connection.id}>
                                                <TableCell className="font-medium">
                                                    {connection.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {getModelName(connection.modelId)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {modelInfo.provider}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {modelInfo.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[240px] text-sm">
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
                                                <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                    {connection.endpoint}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {credentialType === 'Key Vault' ? (
                                                            <>
                                                                <Shield className="h-4 w-4 text-green-600" />
                                                                <span className="text-xs text-green-600">Secure</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Key className="h-4 w-4 text-blue-600" />
                                                                <span className="text-xs text-blue-600">Env Var</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        {connection.isDefaultModel ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                            >
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
                                                                {testingConnectionId === connection.id ? 'Testing...' : 'Test Connection'}
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
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the connection "{deleteDialog?.name}"? This action cannot be undone.
                            The API key will be removed from Azure Key Vault.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteDialog) {
                                    handleDelete(deleteDialog)
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
