'use client'

/**
 * Edit System Connection Page
 * Form for editing an existing system-wide AI connection
 */

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    useSystemConnection,
    useAIModelsCatalog,
    useTestSystemConnection,
} from '@/hooks/use-ai-settings'
import { ConnectionForm } from '../../../../ai-settings/components/ConnectionForm'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function EditConnectionPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()
    const [isTesting, setIsTesting] = useState(false)
    const { data: connection, isLoading: isConnectionLoading } = useSystemConnection(id)
    const { data: catalogData, isLoading: isCatalogLoading } = useAIModelsCatalog()
    const testMutation = useTestSystemConnection()

    const isLoading = isConnectionLoading || isCatalogLoading
    const models = catalogData?.models || []

    const handleTest = async () => {
        setIsTesting(true)
        try {
            await testMutation.mutateAsync(id)
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!connection) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/admin/ai/connections')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium">Connection not found</h3>
                            <p className="text-muted-foreground mb-4">
                                The connection you're looking for doesn't exist or has been deleted.
                            </p>
                            <Button onClick={() => router.push('/admin/ai/connections')}>
                                Back to Connections
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/admin/ai/connections')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Edit Connection</h2>
                        <p className="text-muted-foreground">
                            {connection.name}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={isTesting}
                >
                    <Zap className="mr-2 h-4 w-4" />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
            </div>

            {/* Form Card */}
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Connection Details</CardTitle>
                    <CardDescription>
                        Update connection settings. Leave the API key field empty to keep the existing key.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectionForm
                        mode="edit"
                        connection={connection}
                        models={models}
                        onSuccess={() => {
                            router.push('/admin/ai/connections')
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
