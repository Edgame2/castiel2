"use client"

import { useMemo } from "react"
import type { Widget } from "@/types/dashboard"
import { DocumentPreview } from "@/components/documents/document-preview"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { FileIcon } from "lucide-react"

interface DocumentPreviewWidgetProps {
    widget: Widget
    widgetContext?: {
        shardId?: string;
        shardTypeId?: string;
        [key: string]: any;
    }
}

interface DocumentDownloadInfo {
    downloadUrl: string
    fileName: string
    mimeType: string
}

export function DocumentPreviewWidget({ widget, widgetContext }: DocumentPreviewWidgetProps) {
    // Determine Document ID:
    // 1. From widget config (Pinned)
    // 2. From dashboard context (Dynamic)
    const configDocumentId = (widget.config as any)?.documentId
    const contextDocumentId = widgetContext?.shardTypeId === 'c_document' ? widgetContext?.shardId : undefined

    const documentId = configDocumentId || contextDocumentId

    // Fetch download URL (SAS)
    const { data, isLoading, error } = useQuery({
        queryKey: ['document-download-url', documentId],
        queryFn: async () => {
            if (!documentId) return null

            // We assume the backend generic "download" endpoint returns the JSON with SAS URL
            const response = await apiClient.get<{ data: DocumentDownloadInfo }>(`/api/v1/documents/${documentId}/download`)
            return response.data.data
        },
        enabled: !!documentId,
        // Refresh every 10 mins (SAS URLs usually expire in 15-60 mins)
        staleTime: 1000 * 60 * 10,
        retry: 1
    })

    // Case 1: No Document ID
    if (!documentId) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <FileIcon className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No document selected</p>
                <p className="text-xs">Pin a document in widget settings or select a document in the dashboard.</p>
            </div>
        )
    }

    // Case 2: Loading URL
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-muted/10 rounded-md">
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="h-10 w-10 bg-muted rounded"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                </div>
            </div>
        )
    }

    // Case 3: Error
    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-destructive border rounded-lg bg-destructive/5">
                <FileIcon className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">Failed to load document</p>
                <p className="text-xs max-w-[200px] truncate">{(error as Error)?.message || "Unknown error"}</p>
            </div>
        )
    }

    // Case 4: Render Preview
    return (
        <div className="h-full w-full overflow-hidden rounded-md">
            <DocumentPreview
                url={data.downloadUrl}
                mimeType={data.mimeType}
                name={data.fileName}
                className="h-full w-full"
            />
        </div>
    )
}
