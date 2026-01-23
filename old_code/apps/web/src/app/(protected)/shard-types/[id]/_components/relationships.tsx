'use client'

import { RelationshipGraph } from '@/components/shard-types/relationship-graph'

interface RelationshipsTabProps {
    relationships: any[]
}

export function RelationshipsTab({ relationships }: RelationshipsTabProps) {
    return <RelationshipGraph relationships={relationships} />
}
