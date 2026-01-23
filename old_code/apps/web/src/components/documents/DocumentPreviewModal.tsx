"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Shard } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DocumentPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shard: Shard | null
}

export function DocumentPreviewModal({ open, onOpenChange, shard }: DocumentPreviewModalProps) {
    if (!shard) return null

    // Helper to determine if we can preview
    const getPreviewContent = () => {
        // Since we don't have the real Document type with `blobUrl` here directly (unless we cast shard),
        // we'll assume standard URL or check structuredData if available.
        // For now, let's look for a download URL or similar.
        // If it's a "Document" type, it usually has metadata.

        // Mocking preview logic for now:
        const mimeType = (shard.metadata as any)?.mimeType || "application/octet-stream"

        if (mimeType.startsWith("image/")) {
            return (
                <div className="flex items-center justify-center p-4 bg-muted/20 rounded-md">
                    <p>Image Preview Placeholder (No URL in shard yet)</p>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20 rounded-md">
                <p>No preview available for this file type.</p>
                <p className="text-xs mt-2">{mimeType}</p>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>{shard.name || "Document Preview"}</DialogTitle>
                    {/* Actions */}
                </DialogHeader>
                <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                    {getPreviewContent()}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" asChild>
                            <a href="#" download>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
