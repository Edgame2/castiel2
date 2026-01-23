'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EnrichmentType, EnrichmentFrequency } from '@/types/shard-types'
import { Plus, Trash2 } from 'lucide-react'

interface EnrichmentFieldConfig {
    fieldName: string
    enrichmentType: EnrichmentType
    prompt?: string
    sourceFields?: string[]
    autoApply?: boolean
    confidence?: number
}

interface EnrichmentConfiguration {
    enabled: boolean
    fields: EnrichmentFieldConfig[]
    frequency: EnrichmentFrequency
    provider?: {
        name: string
        model?: string
        temperature?: number
        maxTokens?: number
    }
    budget?: {
        daily?: number
        monthly?: number
    }
}

interface EnrichmentConfigBuilderProps {
    value?: EnrichmentConfiguration
    onChange: (config?: EnrichmentConfiguration) => void
    availableFields: string[]
}

export function EnrichmentConfigBuilder({ value, onChange, availableFields }: EnrichmentConfigBuilderProps) {
    const [enabled, setEnabled] = useState(value?.enabled || false)

    const handleToggle = (checked: boolean) => {
        setEnabled(checked)
        if (!checked) {
            onChange(undefined)
        } else {
            onChange({
                enabled: true,
                fields: [],
                frequency: EnrichmentFrequency.MANUAL,
            })
        }
    }

    const addField = () => {
        if (!value) return
        onChange({
            ...value,
            fields: [
                ...value.fields,
                {
                    fieldName: '',
                    enrichmentType: EnrichmentType.EXTRACT,
                    autoApply: false,
                },
            ],
        })
    }

    const updateField = (index: number, field: EnrichmentFieldConfig) => {
        if (!value) return
        const updated = [...value.fields]
        updated[index] = field
        onChange({ ...value, fields: updated })
    }

    const deleteField = (index: number) => {
        if (!value) return
        onChange({
            ...value,
            fields: value.fields.filter((_, i) => i !== index),
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch checked={enabled} onCheckedChange={handleToggle} />
                <Label>Enable AI Enrichment</Label>
            </div>

            {enabled && value && (
                <div className="space-y-4 border rounded-md p-4">
                    <div>
                        <Label>Frequency</Label>
                        <Select
                            value={value.frequency}
                            onValueChange={(v) =>
                                onChange({ ...value, frequency: v as EnrichmentFrequency })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={EnrichmentFrequency.ON_CREATE}>On Create</SelectItem>
                                <SelectItem value={EnrichmentFrequency.ON_UPDATE}>On Update</SelectItem>
                                <SelectItem value={EnrichmentFrequency.MANUAL}>Manual</SelectItem>
                                <SelectItem value={EnrichmentFrequency.SCHEDULED}>Scheduled</SelectItem>
                                <SelectItem value={EnrichmentFrequency.CONTINUOUS}>Continuous</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Field Enrichments</Label>
                            <Button variant="outline" size="sm" onClick={addField}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {value.fields.map((field, index) => (
                                <div key={index} className="space-y-2 p-3 border rounded">
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={field.fieldName}
                                            onValueChange={(v) =>
                                                updateField(index, { ...field, fieldName: v })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableFields.map((f) => (
                                                    <SelectItem key={f} value={f}>
                                                        {f}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={field.enrichmentType}
                                            onValueChange={(v) =>
                                                updateField(index, { ...field, enrichmentType: v as EnrichmentType })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(EnrichmentType).map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="sm" onClick={() => deleteField(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Custom prompt (optional)"
                                        value={field.prompt || ''}
                                        onChange={(e) => updateField(index, { ...field, prompt: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Input
                            placeholder="Provider name (e.g., OpenAI)"
                            value={value.provider?.name || ''}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    provider: { ...value.provider, name: e.target.value },
                                })
                            }
                        />
                        <Input
                            placeholder="Model (e.g., gpt-4)"
                            value={value.provider?.model || ''}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    provider: { ...value.provider, name: value.provider?.name || '', model: e.target.value },
                                })
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Budget Limits (USD)</Label>
                        <Input
                            type="number"
                            placeholder="Daily budget"
                            value={value.budget?.daily || ''}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    budget: { ...value.budget, daily: parseFloat(e.target.value) },
                                })
                            }
                        />
                        <Input
                            type="number"
                            placeholder="Monthly budget"
                            value={value.budget?.monthly || ''}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    budget: { ...value.budget, monthly: parseFloat(e.target.value) },
                                })
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
