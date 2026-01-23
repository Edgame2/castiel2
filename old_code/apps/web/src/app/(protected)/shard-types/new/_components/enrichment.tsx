'use client'

import { EnrichmentConfigBuilder } from '@/components/shard-types/enrichment-config-builder'
import { UseFormReturn } from 'react-hook-form'

interface EnrichmentSectionProps {
    form: UseFormReturn<any>
    availableFields: string[]
}

export function EnrichmentSection({ form, availableFields }: EnrichmentSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI Enrichment</h3>
            <EnrichmentConfigBuilder
                value={form.watch('enrichment')}
                onChange={(value) => form.setValue('enrichment', value)}
                availableFields={availableFields}
            />
        </div>
    )
}
