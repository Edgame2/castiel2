"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, FileText, Database, Link as LinkIcon, ExternalLink, StickyNote } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ShardPicker } from "@/components/ui/shard-picker"
import { QuickNoteDialog } from "@/components/content/quick-note-dialog"
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal"
import { shardApi, shardTypeApi } from "@/lib/api/shards"
import { Project, Shard, InternalRelationship } from "@/types/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import { useProjectContext, useAddInternalRelationships } from "@/hooks/use-project-resolver"

interface ProjectLinkedShardsWidgetProps {
    project: Project
    className?: string
    onProjectUpdate?: () => void
}

export function ProjectLinkedShardsWidget({ project, className, onProjectUpdate }: ProjectLinkedShardsWidgetProps) {
    const router = useRouter()
    const linkedShards = project.internal_relationships || []
    const [shardTypes, setShardTypes] = useState<any[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
    const [selectedNote, setSelectedNote] = useState<Shard | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewShard, setPreviewShard] = useState<Shard | null>(null)
    const [usePhase2Context, setUsePhase2Context] = useState(false)
    
    // Phase 2: Get project context with relationship traversal
    const { data: projectContext, isLoading: isContextLoading } = useProjectContext(
        project.id,
        { includeExternal: false, minConfidence: 0.6, maxShards: 200 },
        { enabled: usePhase2Context }
    )
    
    // Phase 2: Hook for adding relationships
    const addRelationships = useAddInternalRelationships()
    
    // Use Phase 2 context if enabled, otherwise use direct relationships
    const displayShards = usePhase2Context && projectContext
        ? projectContext.linkedShards.map(shard => ({
            shardId: shard.id,
            shardTypeId: shard.shardTypeId,
            shardTypeName: shard.shardTypeName || shard.shardType?.displayName,
            shardName: (shard.structuredData as any)?.name || shard.name || "Untitled",
            createdAt: shard.createdAt,
        }))
        : linkedShards

    // Auto-repair effect: if any shard is "Untitled", fetch it and update the name
    useEffect(() => {
        const untitledShards = linkedShards.filter(s => s.shardName === "Untitled" || !s.shardName)
        if (untitledShards.length === 0) return

        const repairShards = async () => {
            const updates: InternalRelationship[] = []
            for (const s of untitledShards) {
                try {
                    const freshShard = await shardApi.getShard(s.shardId)
                    // Try all possible name locations
                    const realName = (freshShard.structuredData as any)?.name ||
                        (freshShard.structuredData as any)?.title ||
                        freshShard.name ||
                        "Untitled"

                    if (realName !== "Untitled") {
                        updates.push({ ...s, shardName: realName })
                    }
                } catch (e) {
                    const errorObj = e instanceof Error ? e : new Error(String(e))
                    trackTrace(`Failed to repair shard ${s.shardId}`, 2, {
                        errorMessage: errorObj.message,
                        shardId: s.shardId,
                    })
                }
            }

            if (updates.length > 0) {
                // Update the project with repaired relationships
                const newRels = linkedShards.map(orig => {
                    const update = updates.find(u => u.shardId === orig.shardId)
                    return update || orig
                })

                await shardApi.updateShard(project.id, {
                    internal_relationships: newRels
                })
                onProjectUpdate?.()
            }
        }

        repairShards()
    }, [linkedShards, project.id, onProjectUpdate])

    useEffect(() => {
        const fetchShardTypes = async () => {
            try {
                const types = await shardTypeApi.getShardTypes()
                setShardTypes(types)
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace("Failed to fetch shard types in project-linked-shards-widget", 3, {
                    errorMessage: errorObj.message,
                })
            }
        }
        fetchShardTypes()
    }, [])

    const linkShard = async (shardId: string) => {
        try {
            const currentRels = project.internal_relationships || []
            if (currentRels.find(r => r.shardId === shardId)) {
                toast.error("Shard is already linked")
                return
            }

            // We need to fetch the shard details to add it to relationships
            const shard = await shardApi.getShard(shardId)
            const type = await shardTypeApi.getShardType(shard.shardTypeId)

            // Use Phase 2 API if available, otherwise fall back to direct update
            try {
                await addRelationships.mutateAsync({
                    projectId: project.id,
                    data: {
                        relationships: [{
                            shardId: shard.id,
                            shardTypeId: shard.shardTypeId,
                            shardTypeName: shard.shardTypeName || type.name,
                            shardName: (shard.structuredData as any)?.name || (shard.structuredData as any)?.title || shard.name || "Untitled",
                            metadata: {
                                source: 'manual' as const,
                                confidence: 1.0,
                            },
                        }],
                    },
                })
            } catch (phase2Error) {
                // Fallback to direct update if Phase 2 API fails
                const errorObj = phase2Error instanceof Error ? phase2Error : new Error(String(phase2Error))
                trackTrace("Phase 2 API failed, using fallback", 2, {
                    errorMessage: errorObj.message,
                    projectId: project.id,
                    shardId,
                })
                const newRel = {
                    shardId: shard.id,
                    shardTypeId: shard.shardTypeId,
                    shardTypeName: shard.shardTypeName || type.name,
                    shardName: (shard.structuredData as any)?.name || (shard.structuredData as any)?.title || shard.name || "Untitled",
                    createdAt: new Date().toISOString()
                }

                const updatedRels = [...currentRels, newRel]

                await shardApi.updateShard(project.id, {
                    internal_relationships: updatedRels,
                })
            }

            toast.success("Shard linked successfully")
            setIsDialogOpen(false)
            router.refresh()
            onProjectUpdate?.()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to link shard", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
                shardId,
            })
            toast.error("Failed to link shard")
        }
    }

    const unlinkShard = async (shardId: string) => {
        try {
            const updatedRels = (project.internal_relationships || []).filter(r => r.shardId !== shardId)

            await shardApi.updateShard(project.id, {
                internal_relationships: updatedRels,
            })

            toast.success("Shard unlinked")
            router.refresh()
            onProjectUpdate?.()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to unlink shard", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
                shardId,
            })
            toast.error("Failed to unlink shard")
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "document":
                return <FileText className="h-4 w-4" />
            case "data":
                return <Database className="h-4 w-4" />
            case "note":
            case "c_note":
                return <StickyNote className="h-4 w-4" />
            default:
                return <LinkIcon className="h-4 w-4" />
        }
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Linked Shards</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUsePhase2Context(!usePhase2Context)}
                        className="h-6 px-2 text-xs"
                        disabled={isContextLoading}
                    >
                        {usePhase2Context ? "Show Direct" : "Show Full Context"}
                    </Button>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Link a Shard</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden p-1">
                            {shardTypes.length > 0 && (
                                <ShardPicker
                                    shardTypeId={shardTypes[0].id}
                                    shardTypeIds={shardTypes.map(t => t.id)}
                                    value={null}
                                    onChange={(val) => {
                                        if (typeof val === 'string') {
                                            linkShard(val)
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                    <FileText className="h-4 w-4" />
                </Button>
                <QuickNoteDialog
                    open={isNoteDialogOpen}
                    onOpenChange={(open) => {
                        setIsNoteDialogOpen(open)
                        if (!open) {
                            setSelectedNote(null) // Reset selection on close
                            onProjectUpdate?.()
                        }
                    }}
                    project={project}
                    shard={selectedNote}
                    onNoteCreated={(shard) => linkShard(shard.id)}
                    onNoteUpdated={() => onProjectUpdate?.()}
                />
                <DocumentPreviewModal
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    shard={previewShard}
                />
            </CardHeader >
            <CardContent>
                {isContextLoading && usePhase2Context ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">Loading project context...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            {displayShards.length > 0 ? (
                                displayShards.map((rel) => {
                                const type = shardTypes.find(t => t.id === rel.shardTypeId);
                                return (
                                    <div key={rel.shardId} className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden w-full">
                                            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                                                {getIcon(type?.category || "")}
                                            </div>
                                            <div className="flex flex-col overflow-hidden flex-1">
                                                <button
                                                    onClick={async () => {
                                                        const freshShard = await shardApi.getShard(rel.shardId)
                                                        const typeName = type?.name || rel.shardTypeName;

                                                        if (typeName === "c_note" || typeName === "note") {
                                                            setSelectedNote(freshShard)
                                                            setIsNoteDialogOpen(true)
                                                        } else if (typeName === "document" || typeName === "c_document" || typeName === "Document") {
                                                            setPreviewShard(freshShard)
                                                            setIsPreviewOpen(true)
                                                        } else {
                                                            router.push(`/shards/${rel.shardId}`)
                                                        }
                                                    }}
                                                    className="text-sm font-medium hover:underline flex items-center gap-1 min-w-0 text-left"
                                                >
                                                    <span className="truncate">{rel.shardName || "Untitled"}</span>
                                                    {type?.name !== "c_note" && type?.name !== "note" && type?.name !== "document" && type?.name !== "c_document" && <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />}
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                                        {rel.shardTypeName || type?.displayName || type?.name || "Unknown Type"}
                                                    </Badge>
                                                    {/* Description is not available in cached relationship, maybe add it? For now omit or fetch if needed. */}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => unlinkShard(rel.shardId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {usePhase2Context ? "No linked shards found in project context." : "No linked shards yet."}
                                </p>
                            )}
                        </div>
                        {usePhase2Context && projectContext && (
                            <p className="text-xs text-muted-foreground text-center">
                                Showing {projectContext.totalCount} linked shard{projectContext.totalCount !== 1 ? 's' : ''} via relationship traversal
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
