"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { FileIcon, ImageIcon, FileText, AlertCircle, RefreshCw, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface DocumentPreviewProps {
    url: string
    mimeType: string
    name?: string
    className?: string
    onError?: (error: Error) => void
}

export function DocumentPreview({
    url,
    mimeType,
    name,
    className,
    onError,
}: DocumentPreviewProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [content, setContent] = useState<string | null>(null)

    // Reset state when URL changes
    useEffect(() => {
        setIsLoading(true)
        setError(null)
        setContent(null)
    }, [url])

    // Fetch content for text-based types
    useEffect(() => {
        const isTextBased =
            mimeType === "text/markdown" ||
            mimeType === "text/plain" ||
            mimeType.endsWith("markdown") ||
            name?.endsWith(".md")

        if (isTextBased && url) {
            fetch(url)
                .then(async (res) => {
                    if (!res.ok) throw new Error("Failed to load document content")
                    return res.text()
                })
                .then((text) => {
                    setContent(text)
                    setIsLoading(false)
                })
                .catch((err) => {
                    const errorObj = err instanceof Error ? err : new Error(String(err))
                    trackException(errorObj, 3)
                    trackTrace("Error loading text content", 3, {
                      errorMessage: errorObj.message,
                      documentName: name,
                      mimeType,
                    })
                    setError(err)
                    setIsLoading(false)
                    onError?.(err)
                })
        } else {
            // For non-text based, we just rely on iframe/img loading events
            // But we set isLoading false immediately for ones that don't have explicit load events 
            // or handled inside the render block
        }
    }, [url, mimeType, name, onError])

    const handleIframeLoad = () => {
        setIsLoading(false)
    }

    const handleIframeError = () => {
        const err = new Error("Failed to load preview")
        setError(err)
        setIsLoading(false)
        onError?.(err)
    }

    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center p-6 h-full min-h-[200px] border rounded-md bg-muted/10", className)}>
                <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                <p className="text-sm font-medium text-center mb-1">Preview Unavailable</p>
                <p className="text-xs text-muted-foreground text-center mb-4 max-w-[200px]">
                    {error.message || "We couldn't load this document."}
                </p>
                <Button variant="outline" size="sm" asChild>
                    <a href={url} download={name} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                    </a>
                </Button>
            </div>
        )
    }

    // --- Renderers ---

    // 1. Images
    if (mimeType.startsWith("image/")) {
        return (
            <div className={cn("relative flex items-center justify-center h-full w-full bg-black/5 overflow-hidden rounded-md", className)}>
                {isLoading && <Skeleton className="absolute inset-0 z-10" />}
                <img
                    src={url}
                    alt={name || "Document Preview"}
                    className="max-w-full max-h-full object-contain"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        handleIframeError()
                        setIsLoading(false)
                    }}
                />
            </div>
        )
    }

    // 2. PDF
    if (mimeType === "application/pdf") {
        return (
            <div className={cn("relative h-full w-full rounded-md border bg-white overflow-hidden", className)}>
                {isLoading && <Skeleton className="absolute inset-0 z-10" />}
                <iframe
                    src={`${url}#view=FitH`}
                    className="w-full h-full"
                    title={name || "PDF Preview"}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                />
            </div>
        )
    }

    // 3. Office Documents
    const isOffice =
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || // docx
        mimeType === "application/msword" || // doc
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // xlsx
        mimeType === "application/vnd.ms-excel" || // xls
        mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || // pptx
        mimeType === "application/vnd.ms-powerpoint" || // ppt
        name?.endsWith(".docx") ||
        name?.endsWith(".xlsx") ||
        name?.endsWith(".pptx")

    if (isOffice) {
        // MS Office Online Viewer
        // Note: URL must be encoded

        // Check for localhost/private IP
        const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("::1");

        if (isLocalhost) {
            return (
                <div className={cn("flex flex-col items-center justify-center p-6 h-full border rounded-md bg-muted/10", className)}>
                    <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                    <p className="text-sm font-medium mb-1">Preview Unavailable Locally</p>
                    <p className="text-xs text-muted-foreground text-center mb-4 max-w-[250px]">
                        Microsoft Office Viewer requires a public URL. It cannot access files on your local machine.
                    </p>
                    <Button variant="default" size="sm" asChild>
                        <a href={url} download={name} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download to View
                        </a>
                    </Button>
                </div>
            )
        }

        const encodedUrl = encodeURIComponent(url)
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`

        // Log Office Viewer debug info in development only
        if (process.env.NODE_ENV === 'development') {
            trackTrace("Office Viewer Debug", 0, {
                originalUrl: url,
                encodedUrl: encodedUrl,
                finalViewerUrl: officeViewerUrl,
            })
        }

        // MS Viewer doesn't trigger standard iframe onLoad reliably across domains, so we often just set loading to false after a timeout or presume it works.
        // However, showing a spinner for a bit is nice.
        return (
            <div className={cn("relative h-full w-full rounded-md border bg-white overflow-hidden", className)}>
                <iframe
                    src={officeViewerUrl}
                    className="w-full h-full"
                    title={name || "Office Document Preview"}
                    onLoad={handleIframeLoad}
                // Note: onerror on iframe often doesn't fire for cross-origin issues
                />
                {/* Fallback download link if viewer fails visually (user can see this if iframe is blank) */}
                <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" asChild className="h-6 w-6">
                        <a href={url} download={name} target="_blank" rel="noopener noreferrer" title="Download Original">
                            <Download className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
            </div>
        )
    }

    // 4. Markdown / Text
    if (mimeType === "text/markdown" || mimeType === "text/plain" || name?.endsWith(".md")) {
        return (
            <div className={cn("relative h-full w-full rounded-md border bg-white overflow-hidden flex flex-col", className)}>
                {isLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-6">
                        <article className="prose prose-sm dark:prose-invert max-w-none">
                            {mimeType === "text/plain" ? (
                                <pre className="whitespace-pre-wrap font-mono text-xs">{content}</pre>
                            ) : (
                                <ReactMarkdown>{content || "*No content*"}</ReactMarkdown>
                            )}
                        </article>
                    </ScrollArea>
                )}
            </div>
        )
    }

    // 5. HTML
    if (mimeType === "text/html") {
        return (
            <div className={cn("relative h-full w-full rounded-md border bg-white overflow-hidden", className)}>
                <iframe
                    src={url}
                    sandbox="allow-scripts" // Minimal permissions, restrictive
                    className="w-full h-full"
                    title={name || "HTML Preview"}
                    onLoad={handleIframeLoad}
                />
            </div>
        )
    }

    // 6. Fallback
    return (
        <div className={cn("flex flex-col items-center justify-center p-6 h-full border rounded-md bg-muted/10", className)}>
            <FileIcon className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">{name || "Document"}</p>
            <p className="text-xs text-muted-foreground mb-4">
                Preview not available for this file type ({mimeType})
            </p>
            <Button variant="default" size="sm" asChild>
                <a href={url} download={name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                </a>
            </Button>
        </div>
    )
}
