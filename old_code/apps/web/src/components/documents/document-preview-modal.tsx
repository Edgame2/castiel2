"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DocumentPreview } from "@/components/documents/document-preview"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

interface DocumentPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shard: any // Should be Shard type ideally, but keeping flexible for now
}

interface DocumentDownloadInfo {
    downloadUrl: string
    fileName: string
    mimeType: string
}

export function DocumentPreviewModal({ open, onOpenChange, shard }: DocumentPreviewModalProps) {
    const documentId = shard?.id

    const { data, isLoading, error } = useQuery({
        queryKey: ['document-download-url', documentId],
        queryFn: async () => {
            if (!documentId) return null
            const response = await apiClient.get<{ data: DocumentDownloadInfo }>(`/api/v1/documents/${documentId}/download`)
            return response.data.data
        },
        enabled: !!documentId && open,
        staleTime: 1000 * 60 * 10,
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[90vw] h-[85vh] flex flex-col p-6">
                <DialogHeader className="mb-2">
                    <DialogTitle className="flex items-center gap-2 truncate pr-6">
                        <span>{shard?.name || data?.fileName || "Document Preview"}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative border rounded-md bg-background/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-destructive">
                            <p className="font-medium mb-1">Failed to load document</p>
                            <p className="text-sm opacity-80">{(error as Error).message}</p>
                        </div>
                    ) : (data ? (
                        <DocumentPreview
                            url={data.downloadUrl}
                            mimeType={data.mimeType}
                            name={data.fileName}
                            className="h-full w-full border-none"
                        />
                    ) : null)}
                </div>
            </DialogContent>
        </Dialog>
    )
}
