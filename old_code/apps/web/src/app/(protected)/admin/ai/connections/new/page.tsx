'use client'

/**
 * Create New System Connection Page
 * Form for creating a new system-wide AI connection
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAIModelsCatalog } from '@/hooks/use-ai-settings'
import { ConnectionForm } from '../../../ai-settings/components/ConnectionForm'

export default function NewConnectionPage() {
    const router = useRouter()
    const { data: catalogData, isLoading } = useAIModelsCatalog()

    const models = catalogData?.models || []

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

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/admin/ai/connections')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create New Connection</h2>
                    <p className="text-muted-foreground">
                        Configure a new system-wide AI connection
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Connection Details</CardTitle>
                    <CardDescription>
                        Set up a system-wide connection with API key stored securely in Azure Key Vault
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectionForm
                        mode="create"
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
