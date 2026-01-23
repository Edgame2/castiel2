'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ShardType } from '@/types/shard-types'
import { useState } from 'react'

interface CloneShardTypeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shardType: ShardType
    onClone: (customizations: any) => void
}

export function CloneShardTypeDialog({
    open,
    onOpenChange,
    shardType,
    onClone,
}: CloneShardTypeDialogProps) {
    const [formData, setFormData] = useState({
        name: `${shardType.name}-copy`,
        displayName: `${shardType.displayName} (Copy)`,
        description: shardType.description || '',
        includeFields: true,
        includeEnrichment: true,
        includeValidation: true,
        includeWorkflow: true,
    })

    const handleClone = () => {
        onClone({
            name: formData.name,
            displayName: formData.displayName,
            description: formData.description,
            tenantId: 'current', // Will be set by API
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Clone ShardType: {shardType.displayName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Display Name</Label>
                        <Input
                            value={formData.displayName}
                            onChange={(e) =>
                                setFormData({ ...formData, displayName: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Include</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.includeFields}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, includeFields: checked as boolean })
                                    }
                                />
                                <Label>Field Definitions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.includeEnrichment}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            includeEnrichment: checked as boolean,
                                        })
                                    }
                                />
                                <Label>Enrichment Configuration</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.includeValidation}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            includeValidation: checked as boolean,
                                        })
                                    }
                                />
                                <Label>Validation Rules</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.includeWorkflow}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, includeWorkflow: checked as boolean })
                                    }
                                />
                                <Label>Workflow Configuration</Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleClone}>Clone ShardType</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
