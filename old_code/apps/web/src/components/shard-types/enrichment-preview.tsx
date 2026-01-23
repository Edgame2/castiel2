'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

interface EnrichmentPreviewProps {
    enrichmentConfig: any
    onTrigger: (data: any) => Promise<any>
}

export function EnrichmentPreview({ enrichmentConfig, onTrigger }: EnrichmentPreviewProps) {
    const [sampleData, setSampleData] = useState('')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const handleTrigger = async () => {
        setLoading(true)
        try {
            const data = JSON.parse(sampleData)
            const res = await onTrigger(data)
            setResult(res)
        } catch (error) {
            setResult({ error: 'Invalid JSON or enrichment failed' })
        }
        setLoading(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Enrichment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Textarea
                        placeholder="Sample data (JSON)"
                        value={sampleData}
                        onChange={(e) => setSampleData(e.target.value)}
                        rows={6}
                    />
                </div>
                <Button onClick={handleTrigger} disabled={loading || !sampleData}>
                    {loading ? 'Processing...' : 'Trigger Enrichment'}
                </Button>
                {result && (
                    <div className="p-3 border rounded-md bg-muted">
                        <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
