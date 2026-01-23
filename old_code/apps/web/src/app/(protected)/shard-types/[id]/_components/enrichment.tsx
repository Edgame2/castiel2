'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnrichmentPreview } from '@/components/shard-types/enrichment-preview'

interface EnrichmentTabProps {
    enrichment?: any
    shardTypeId: string
}

export function EnrichmentTab({ enrichment, shardTypeId }: EnrichmentTabProps) {
    if (!enrichment?.enabled) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                        Enrichment is not enabled for this ShardType
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Enrichment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="text-sm font-medium mb-2">Frequency</div>
                        <Badge variant="outline">{enrichment.frequency}</Badge>
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-2">Fields</div>
                        <div className="space-y-2">
                            {enrichment.fields?.map((field: any, index: number) => (
                                <div key={index} className="p-2 border rounded-md text-sm">
                                    <div className="font-medium">{field.fieldName}</div>
                                    <div className="text-muted-foreground">{field.enrichmentType}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {enrichment.provider && (
                        <div>
                            <div className="text-sm font-medium mb-2">Provider</div>
                            <div className="text-sm text-muted-foreground">
                                {enrichment.provider.name} - {enrichment.provider.model}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <EnrichmentPreview
                enrichmentConfig={enrichment}
                onTrigger={async (data) => {
                    // Call API to trigger enrichment
                    return { message: 'Enrichment triggered' }
                }}
            />
        </div>
    )
}
