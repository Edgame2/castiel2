'use client'

import { RelationshipBuilder } from '@/components/shard-types/relationship-builder'
import { UseFormReturn } from 'react-hook-form'

interface RelationshipsSectionProps {
    form: UseFormReturn<any>
    availableShardTypes: Array<{ id: string; name: string; displayName: string }>
}

export function RelationshipsSection({ form, availableShardTypes }: RelationshipsSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Relationships</h3>
            <RelationshipBuilder
                value={form.watch('relationships') || []}
                onChange={(value) => form.setValue('relationships', value)}
                availableShardTypes={availableShardTypes}
            />
        </div>
    )
}
