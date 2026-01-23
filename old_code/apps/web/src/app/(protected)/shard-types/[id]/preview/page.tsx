"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShardTypePreview } from "@/components/shard-types"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { useShardType } from "@/hooks/use-shard-types"
import { trackTrace } from "@/lib/monitoring/app-insights"

export default function ShardTypePreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data: shardType, isLoading } = useShardType(id)

    if (isLoading) {
        return (
            <div className="flex h-full flex-col">
                <div className="border-b bg-background px-6 py-4">
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        )
    }

    if (!shardType) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Shard Type Not Found</CardTitle>
                        <CardDescription>Loading shard type...</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/shard-types")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Shard Types
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/shard-types/${id}`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Details
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Form Preview: {shardType.displayName}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Test the form generated from this schema
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <ShardTypePreview
                        shardType={shardType}
                        onGenerateSampleData={() => {
                            // TODO: Implement AI-powered sample data generation
                            trackTrace("Generate sample data", 1, {
                                shardTypeId: id,
                            })
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
