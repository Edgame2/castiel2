"use client"

import * as React from "react"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBatchGenerateEmbeddings } from "@/hooks/use-embeddings"
import { Shard } from "@/types/api"
import { Badge } from "@/components/ui/badge"

interface BatchEmbeddingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shards: Shard[]
}

export function BatchEmbeddingDialog({
  open,
  onOpenChange,
  shards,
}: BatchEmbeddingDialogProps) {
  const [force, setForce] = React.useState(false)
  const batchGenerate = useBatchGenerateEmbeddings()

  const handleGenerate = async () => {
    try {
      await batchGenerate.mutateAsync({
        shardIds: shards.map(s => s.id),
        force,
      })
      onOpenChange(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Batch Generate Embeddings
          </DialogTitle>
          <DialogDescription>
            Generate embeddings for {shards.length} selected shard{shards.length !== 1 ? 's' : ''}.
            This will run in the background and may take some time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Shards Info */}
          <div className="space-y-2">
            <Label>Selected Shards</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 space-y-1">
              {shards.length > 10 ? (
                <>
                  {shards.slice(0, 10).map((shard) => (
                    <div key={shard.id} className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {shard.shardTypeId}
                      </Badge>
                      <span className="truncate">{shard.name}</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground pt-1">
                    ... and {shards.length - 10} more
                  </div>
                </>
              ) : (
                shards.map((shard) => (
                  <div key={shard.id} className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {shard.shardTypeId}
                    </Badge>
                    <span className="truncate">{shard.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Force Regenerate Option */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="force-regenerate" className="text-base">
                Force Regenerate
              </Label>
              <p className="text-sm text-muted-foreground">
                Regenerate embeddings even if they already exist
              </p>
            </div>
            <Switch
              id="force-regenerate"
              checked={force}
              onCheckedChange={setForce}
            />
          </div>

          {/* Warning */}
          {shards.length > 50 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Large batch selected</p>
                <p>
                  Processing {shards.length} shards may take a significant amount of time.
                  You can monitor progress in the Embedding Jobs dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={batchGenerate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={batchGenerate.isPending}
          >
            {batchGenerate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Embeddings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}






