'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RelationshipType } from '@/types/shard-types'
import { Plus, Trash2, Edit } from 'lucide-react'

interface RelationshipDefinition {
    name: string
    displayName?: string
    type: RelationshipType
    targetShardType: string
    required?: boolean
    cascade?: boolean
}

interface RelationshipBuilderProps {
    value: RelationshipDefinition[]
    onChange: (relationships: RelationshipDefinition[]) => void
    availableShardTypes: Array<{ id: string; name: string; displayName: string }>
}

export function RelationshipBuilder({ value, onChange, availableShardTypes }: RelationshipBuilderProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [formData, setFormData] = useState<RelationshipDefinition>({
        name: '',
        type: RelationshipType.ONE_TO_MANY,
        targetShardType: '',
    })

    const handleAdd = () => {
        if (!formData.name || !formData.targetShardType) return
        onChange([...value, formData])
        setFormData({ name: '', type: RelationshipType.ONE_TO_MANY, targetShardType: '' })
    }

    const handleUpdate = () => {
        if (editingIndex === null) return
        const updated = [...value]
        updated[editingIndex] = formData
        onChange(updated)
        setEditingIndex(null)
        setFormData({ name: '', type: RelationshipType.ONE_TO_MANY, targetShardType: '' })
    }

    const handleDelete = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleEdit = (index: number) => {
        setEditingIndex(index)
        setFormData(value[index])
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Relationships</h3>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Relationship
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? 'Edit' : 'Add'} Relationship
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., opportunities"
                                />
                            </div>
                            <div>
                                <Label>Display Name</Label>
                                <Input
                                    value={formData.displayName || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, displayName: e.target.value })
                                    }
                                    placeholder="e.g., Opportunities"
                                />
                            </div>
                            <div>
                                <Label>Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, type: v as RelationshipType })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={RelationshipType.ONE_TO_ONE}>
                                            One to One
                                        </SelectItem>
                                        <SelectItem value={RelationshipType.ONE_TO_MANY}>
                                            One to Many
                                        </SelectItem>
                                        <SelectItem value={RelationshipType.MANY_TO_MANY}>
                                            Many to Many
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Target ShardType</Label>
                                <Select
                                    value={formData.targetShardType}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, targetShardType: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableShardTypes.map((st) => (
                                            <SelectItem key={st.id} value={st.id}>
                                                {st.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.required}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, required: checked as boolean })
                                    }
                                />
                                <Label>Required</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.cascade}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, cascade: checked as boolean })
                                    }
                                />
                                <Label>Cascade Delete</Label>
                            </div>
                            <Button onClick={editingIndex !== null ? handleUpdate : handleAdd}>
                                {editingIndex !== null ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {value.map((rel, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md"
                    >
                        <div>
                            <div className="font-medium">{rel.displayName || rel.name}</div>
                            <div className="text-sm text-muted-foreground">
                                {rel.type} → {rel.targetShardType}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(index)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
