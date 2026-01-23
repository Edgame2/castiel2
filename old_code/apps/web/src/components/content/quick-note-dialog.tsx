"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { shardApi, shardTypeApi } from "@/lib/api/shards"
import { Shard, Project } from "@/types/api"
import { toast } from "sonner"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import { useAuth } from "@/contexts/auth-context"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface QuickNoteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project?: Project
    shard?: Shard | null // For editing existing notes
    onNoteCreated?: (shard: Shard) => void
    onNoteUpdated?: (shard: Shard) => void
}

const NOTE_SHARD_TYPE_NAME = "c_note"
const AUTOSAVE_DELAY = 2000

export function QuickNoteDialog({ open, onOpenChange, project, shard: initialShard, onNoteCreated, onNoteUpdated }: QuickNoteDialogProps) {
    const [title, setTitle] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [shard, setShard] = useState<Shard | null>(null)
    const [content, setContent] = useState<object>({})

    // Initialize state when initialShard changes (edit mode)
    useEffect(() => {
        if (initialShard) {
            setShard(initialShard)
            setTitle(initialShard.name || (initialShard.structuredData as any)?.name || "")
            setContent((initialShard.structuredData as any)?.content || {})
        } else {
            setShard(null)
            setTitle("")
            setContent({})
        }
    }, [initialShard, open]) // Reset on open if needed, or rely on initialShard prop changing
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
    const { user } = useAuth()
    const lastSavedContent = useRef<object | null>(null)
    // Need user for cursor awareness

    // Cleanup provider on unmount or close
    useEffect(() => {
        return () => {
            if (provider) {
                provider.destroy()
            }
        }
    }, [provider])

    // Single step flow:
    // 1. User sees Title Input AND Editor.
    // 2. User types.
    // 3. Auto-save is tricky without ID, so we save on "Create" or debounce create?
    // Request says behavior: "New Quick Note" -> "Title" + "Content" -> Save.
    // Let's assume standard "Create" button for initial creation, then auto-save after.

    const [isSaving, setIsSaving] = useState(false)

    // Actually, to make it "Quick", we want the editor immediately.
    // But we need a document name (shard ID) to collaborate.

    // Approach: 
    // 1. Show Title Input.
    // 2. "Create Note" button.
    // 3. Once created, show Editor and connect.
    // This avoids orphaned shards if they close the dialog before saving (though shards are persisted instantly).

    const handleSave = async () => {
        if (!title.trim()) return

        setIsLoading(true)
        try {
            if (shard) {
                // UPDATE existing shard
                const updatedShard = await shardApi.updateShard(shard.id, {
                    name: title,
                    structuredData: {
                        ...shard.structuredData,
                        name: title,
                        content: content
                    }
                })
                setShard(updatedShard)
                onNoteUpdated?.(updatedShard)
                toast.success("Note saved")
                handleClose()
            } else {
                // CREATE new shard
                const types = await shardTypeApi.getShardTypes()
                const noteType = types.find(t => t.name === NOTE_SHARD_TYPE_NAME)

                if (!noteType) {
                    toast.error("Note shard type not found. Please contact admin.")
                    return
                }

                const newShard = await shardApi.createShard({
                    name: title,
                    shardTypeId: noteType.id,
                    shardTypeName: noteType.name,
                    structuredData: {
                        name: title,
                        content: content
                    },
                    metadata: {},
                    internal_relationships: project ? [{
                        shardId: project.id,
                        shardTypeId: project.shardTypeId,
                        shardTypeName: project.shardTypeName || "Project",
                        shardName: project.name || (project.structuredData as any)?.name || "Untitled",
                        createdAt: new Date().toISOString()
                    }] : []
                })

                setShard(newShard)
                onNoteCreated?.(newShard)
                toast.success("Note created")
                handleClose()
            }

        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to save note", 3, {
              errorMessage: errorObj.message,
              shardId: shard?.id,
            })
            toast.error("Failed to save note")
        } finally {
            setIsLoading(false)
        }
    }

    // Define extensions with provider
    const extensions = useMemo(() => {
        if (!provider || !user) return []

        return [
            Collaboration.configure({
                document: provider.document,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: user.name || 'Anonymous',
                    color: '#f783ac', // Randomize color normally
                },
            }),
        ]
    }, [provider, user])

    // Autosave handler
    const handleContentChange = useCallback((content: string | object) => {
        if (!shard) return
        if (typeof content !== 'object') return // We expect JSON for c_note

        // Simple debounce via timeout tracked in ref could work, 
        // but let's use a simple approach: verify changes against last saved

        // Actually, we need to debounce the API call.
    }, [shard])

    const [contentToSave, setContentToSave] = useState<object | null>(null)

    const saveShard = useCallback(async (content: object) => {
        if (!shard) return
        try {
            await shardApi.updateShard(shard.id, {
                structuredData: {
                    ...shard.structuredData,
                    content: content
                }
            })
            lastSavedContent.current = content
        } catch (e) {
            const errorObj = e instanceof Error ? e : new Error(String(e))
            trackException(errorObj, 3)
            trackTrace("Save failed", 3, {
              errorMessage: errorObj.message,
              shardId: shard?.id,
            })
        }
    }, [shard])

    useEffect(() => {
        if (!contentToSave || !shard) return

        const timer = setTimeout(() => {
            saveShard(contentToSave)
        }, AUTOSAVE_DELAY)

        return () => clearTimeout(timer)
    }, [contentToSave, shard, saveShard])

    const handleClose = async () => {
        if (contentToSave && contentToSave !== lastSavedContent.current) {
            await saveShard(contentToSave)
        }
        onOpenChange(false)
    }


    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                handleClose()
            } else {
                onOpenChange(val)
            }
        }}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>
                        {shard ? shard.name : "New Quick Note"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b">
                            <label className="text-sm font-medium mb-1 block">Note Title</label>
                            <Input
                                placeholder="Meeting Notes - Dec 15"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex-1 overflow-hidden relative p-4">
                            <TipTapEditor
                                content={content}
                                onChange={(c) => setContent(c as object)}
                                extensions={[]} // No collab needed for draft
                                className="h-full border rounded-md w-full"
                                showToolbar={true}
                                mode="default"
                                outputFormat="json"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!title.trim() || isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {shard ? "Save Changes" : "Create Note"}
                        </Button>
                    </div>
                </DialogFooter>


            </DialogContent>
        </Dialog>
    )
}
