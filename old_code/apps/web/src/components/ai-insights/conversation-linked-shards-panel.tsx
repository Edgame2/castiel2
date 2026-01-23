"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, FileText, Database, Link as LinkIcon, ExternalLink, StickyNote, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { shardApi, shardTypeApi } from "@/lib/api/shards"
import { Shard } from "@/types/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useConversation, useUpdateConversation } from "@/hooks/use-insights"
import { useQueryClient } from "@tanstack/react-query"
import { insightKeys } from "@/hooks/use-insights"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface ConversationLinkedShardsPanelProps {
  conversationId: string
  className?: string
}

export function ConversationLinkedShardsPanel({
  conversationId,
  className,
}: ConversationLinkedShardsPanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [shardTypes, setShardTypes] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: conversation, isLoading: conversationLoading } = useConversation(conversationId, {
    includeLinkedShards: true,
  })
  const updateConversation = useUpdateConversation()

  const linkedShards = conversation?.linkedShards || []

  useEffect(() => {
    const fetchShardTypes = async () => {
      try {
        const types = await shardTypeApi.getShardTypes()
        setShardTypes(types)
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace("Failed to fetch shard types", 3, {
          errorMessage: errorObj.message,
          conversationId,
        })
      }
    }
    fetchShardTypes()
  }, [])

  const linkShard = async (shardId: string) => {
    try {
      // Check if already linked
      if (linkedShards.some(ls => ls.id === shardId)) {
        toast.error("Shard is already linked")
        return
      }

      await updateConversation.mutateAsync({
        id: conversationId,
        data: {
          addLinkedShards: [shardId],
        },
      })

      toast.success("Shard linked successfully")
      setIsDialogOpen(false)
      
      // Invalidate conversation query to refresh
      queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(conversationId) })
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to link shard", 3, {
        errorMessage: errorObj.message,
        conversationId,
        shardId,
      })
      toast.error("Failed to link shard")
    }
  }

  const unlinkShard = async (shardId: string) => {
    try {
      await updateConversation.mutateAsync({
        id: conversationId,
        data: {
          removeLinkedShards: [shardId],
        },
      })

      toast.success("Shard unlinked")
      
      // Invalidate conversation query to refresh
      queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(conversationId) })
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to unlink shard", 3, {
        errorMessage: errorObj.message,
        conversationId,
        shardId,
      })
      toast.error("Failed to unlink shard")
    }
  }

  const getIcon = (shardTypeId: string) => {
    const type = shardTypes.find(t => t.id === shardTypeId)
    const category = type?.category || ""
    
    switch (category) {
      case "document":
        return <FileText className="h-4 w-4" />
      case "data":
        return <Database className="h-4 w-4" />
      case "note":
        return <StickyNote className="h-4 w-4" />
      default:
        return <LinkIcon className="h-4 w-4" />
    }
  }

  const handleShardClick = async (shardId: string, shardTypeId: string) => {
    try {
      const freshShard = await shardApi.getShard(shardId)
      const type = shardTypes.find(t => t.id === shardTypeId)
      const typeName = type?.name || ""

      if (typeName === "c_note" || typeName === "note") {
        // Could open note dialog if needed
        router.push(`/shards/${shardId}`)
      } else if (typeName === "document" || typeName === "c_document" || typeName === "Document") {
        // Could open document preview if needed
        router.push(`/shards/${shardId}`)
      } else {
        router.push(`/shards/${shardId}`)
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to fetch shard", 3, {
        errorMessage: errorObj.message,
        shardId,
        shardTypeId,
      })
      toast.error("Failed to open shard")
    }
  }

  if (conversationLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Linked Shards</CardTitle>
          <CardDescription className="text-xs">
            Shards related to this conversation
          </CardDescription>
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
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {linkedShards.length > 0 ? (
            linkedShards.map((linkedShard) => {
              return (
                <div
                  key={linkedShard.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden w-full">
                    <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                      {getIcon(linkedShard.shardTypeId)}
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1">
                      <button
                        onClick={() => handleShardClick(linkedShard.id, linkedShard.shardTypeId)}
                        className="text-sm font-medium hover:underline flex items-center gap-1 min-w-0 text-left"
                      >
                        <span className="truncate">{linkedShard.name || "Untitled"}</span>
                        <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                          {shardTypes.find(t => t.id === linkedShard.shardTypeId)?.displayName || 
                           shardTypes.find(t => t.id === linkedShard.shardTypeId)?.name || 
                           linkedShard.shardTypeId}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => unlinkShard(linkedShard.id)}
                    disabled={updateConversation.isPending}
                  >
                    {updateConversation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No linked shards yet. Click the + button to link a shard.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

