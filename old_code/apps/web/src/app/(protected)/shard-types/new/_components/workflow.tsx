'use client'

import { WorkflowBuilder } from '@/components/shard-types/workflow-builder'
import { UseFormReturn } from 'react-hook-form'

interface WorkflowSectionProps {
    form: UseFormReturn<any>
}

export function WorkflowSection({ form }: WorkflowSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Workflow Configuration</h3>
            <WorkflowBuilder
                value={form.watch('workflow')}
                onChange={(value) => form.setValue('workflow', value)}
            />
        </div>
    )
}
