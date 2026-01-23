'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ColorPicker } from './color-picker'
import { Plus, Trash2 } from 'lucide-react'

interface WorkflowStatus {
    value: string
    label: string
    color?: string
    icon?: string
}

interface WorkflowTransition {
    from: string
    to: string
    label?: string
    requiredRole?: string
}

interface WorkflowConfiguration {
    statusField: string
    statuses: WorkflowStatus[]
    transitions: WorkflowTransition[]
    defaultStatus: string
}

interface WorkflowBuilderProps {
    value?: WorkflowConfiguration
    onChange: (config?: WorkflowConfiguration) => void
}

export function WorkflowBuilder({ value, onChange }: WorkflowBuilderProps) {
    const [enabled, setEnabled] = useState(!!value)

    const handleToggle = (checked: boolean) => {
        setEnabled(checked)
        if (!checked) {
            onChange(undefined)
        } else {
            onChange({
                statusField: 'status',
                statuses: [],
                transitions: [],
                defaultStatus: '',
            })
        }
    }

    const addStatus = () => {
        if (!value) return
        onChange({
            ...value,
            statuses: [
                ...value.statuses,
                { value: '', label: '', color: '#gray' },
            ],
        })
    }

    const updateStatus = (index: number, status: WorkflowStatus) => {
        if (!value) return
        const updated = [...value.statuses]
        updated[index] = status
        onChange({ ...value, statuses: updated })
    }

    const deleteStatus = (index: number) => {
        if (!value) return
        onChange({
            ...value,
            statuses: value.statuses.filter((_, i) => i !== index),
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch checked={enabled} onCheckedChange={handleToggle} />
                <Label>Enable Workflow</Label>
            </div>

            {enabled && value && (
                <div className="space-y-4 border rounded-md p-4">
                    <div>
                        <Label>Status Field Name</Label>
                        <Input
                            value={value.statusField}
                            onChange={(e) => onChange({ ...value, statusField: e.target.value })}
                            placeholder="status"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Statuses</Label>
                            <Button variant="outline" size="sm" onClick={addStatus}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Status
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {value.statuses.map((status, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                    <Input
                                        placeholder="Value"
                                        value={status.value}
                                        onChange={(e) =>
                                            updateStatus(index, { ...status, value: e.target.value })
                                        }
                                    />
                                    <Input
                                        placeholder="Label"
                                        value={status.label}
                                        onChange={(e) =>
                                            updateStatus(index, { ...status, label: e.target.value })
                                        }
                                    />
                                    <ColorPicker
                                        value={status.color}
                                        onChange={(color) => updateStatus(index, { ...status, color })}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteStatus(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Default Status</Label>
                        <Input
                            value={value.defaultStatus}
                            onChange={(e) => onChange({ ...value, defaultStatus: e.target.value })}
                            placeholder="draft"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
