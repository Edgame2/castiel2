'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Link2,
  Plus,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Search,
  Loader2,
  GitBranch,
  Network,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// Relationship type options
const RELATIONSHIP_TYPES = [
  { value: 'references', label: 'References', icon: Link2 },
  { value: 'relatedTo', label: 'Related To', icon: GitBranch },
  { value: 'partOf', label: 'Part Of', icon: Network },
  { value: 'contains', label: 'Contains', icon: Network },
  { value: 'precedes', label: 'Precedes', icon: ArrowRight },
  { value: 'follows', label: 'Follows', icon: ArrowLeft },
  { value: 'derivedFrom', label: 'Derived From', icon: GitBranch },
  { value: 'similarTo', label: 'Similar To', icon: ArrowLeftRight },
  { value: 'dependsOn', label: 'Depends On', icon: Link2 },
  { value: 'mentions', label: 'Mentions', icon: Link2 },
]

interface Relationship {
  id: string
  sourceShardId: string
  targetShardId: string
  type: string
  bidirectional: boolean
  label?: string
  strength?: { value: number }
  relatedShard?: {
    id: string
    name: string
    shardTypeId: string
    shardTypeName?: string
  }
  direction: 'incoming' | 'outgoing'
}

interface RelationshipsPanelProps {
  shardId: string
  relationships?: Relationship[]
  isLoading?: boolean
  onAddRelationship?: (data: {
    targetShardId: string
    type: string
    bidirectional: boolean
    label?: string
  }) => Promise<void>
  onDeleteRelationship?: (relationshipId: string) => Promise<void>
  onSearchShards?: (query: string) => Promise<Array<{
    id: string
    name: string
    shardTypeId: string
  }>>
}

export function RelationshipsPanel({
  shardId,
  relationships = [],
  isLoading = false,
  onAddRelationship,
  onDeleteRelationship,
  onSearchShards,
}: RelationshipsPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteRelationshipId, setDeleteRelationshipId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    name: string
    shardTypeId: string
  }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedShard, setSelectedShard] = useState<typeof searchResults[0] | null>(null)
  const [relationType, setRelationType] = useState('references')
  const [bidirectional, setBidirectional] = useState(false)
  const [label, setLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim() || !onSearchShards) return

    setIsSearching(true)
    try {
      const results = await onSearchShards(searchQuery)
      setSearchResults(results.filter((r) => r.id !== shardId))
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Search failed in relationships panel', 3, {
        errorMessage: errorObj.message,
        shardId,
        searchQuery,
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddRelationship = async () => {
    if (!selectedShard || !onAddRelationship) return

    setIsSubmitting(true)
    try {
      await onAddRelationship({
        targetShardId: selectedShard.id,
        type: relationType,
        bidirectional,
        label: label || undefined,
      })
      setShowAddDialog(false)
      resetForm()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to add relationship', 3, {
        errorMessage: errorObj.message,
        shardId,
        targetShardId: selectedShard.id,
        relationType,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRelationship = async () => {
    if (!deleteRelationshipId || !onDeleteRelationship) return

    try {
      await onDeleteRelationship(deleteRelationshipId)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to delete relationship', 3, {
        errorMessage: errorObj.message,
        shardId,
        relationshipId: deleteRelationshipId,
      })
    } finally {
      setDeleteRelationshipId(null)
    }
  }

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedShard(null)
    setRelationType('references')
    setBidirectional(false)
    setLabel('')
  }

  const getDirectionIcon = (direction: string, bidirectional: boolean) => {
    if (bidirectional) return ArrowLeftRight
    return direction === 'outgoing' ? ArrowRight : ArrowLeft
  }

  const incomingRelationships = relationships.filter((r) => r.direction === 'incoming')
  const outgoingRelationships = relationships.filter((r) => r.direction === 'outgoing')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Relationships
            </CardTitle>
            <CardDescription>
              Connections to other shards in the knowledge graph
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Relationship</DialogTitle>
                <DialogDescription>
                  Connect this shard to another shard in your knowledge graph
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Search for target shard */}
                <div className="space-y-2">
                  <Label>Find Shard</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by name..."
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Shard</Label>
                    <div className="max-h-[200px] overflow-auto space-y-2 border rounded-lg p-2">
                      {searchResults.map((shard) => (
                        <div
                          key={shard.id}
                          onClick={() => setSelectedShard(shard)}
                          className={cn(
                            'p-3 rounded-lg cursor-pointer transition-colors',
                            selectedShard?.id === shard.id
                              ? 'bg-primary/10 border-primary border'
                              : 'hover:bg-muted'
                          )}
                        >
                          <p className="font-medium">{shard.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {shard.shardTypeId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected shard preview */}
                {selectedShard && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Selected: {selectedShard.name}</p>
                  </div>
                )}

                <Separator />

                {/* Relationship type */}
                <div className="space-y-2">
                  <Label>Relationship Type</Label>
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bidirectional toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bidirectional</Label>
                    <p className="text-xs text-muted-foreground">
                      Create a two-way relationship
                    </p>
                  </div>
                  <Button
                    variant={bidirectional ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBidirectional(!bidirectional)}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Optional label */}
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., 'discussed in meeting'"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRelationship}
                  disabled={!selectedShard || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Relationship
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : relationships.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No relationships defined yet
          </p>
        ) : (
          <div className="space-y-6">
            {/* Outgoing relationships */}
            {outgoingRelationships.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  Outgoing ({outgoingRelationships.length})
                </h4>
                <div className="space-y-2">
                  {outgoingRelationships.map((rel) => (
                    <RelationshipItem
                      key={rel.id}
                      relationship={rel}
                      onDelete={() => setDeleteRelationshipId(rel.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Incoming relationships */}
            {incomingRelationships.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Incoming ({incomingRelationships.length})
                </h4>
                <div className="space-y-2">
                  {incomingRelationships.map((rel) => (
                    <RelationshipItem
                      key={rel.id}
                      relationship={rel}
                      onDelete={() => setDeleteRelationshipId(rel.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRelationshipId} onOpenChange={() => setDeleteRelationshipId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection between these shards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRelationship}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function RelationshipItem({
  relationship,
  onDelete,
}: {
  relationship: Relationship
  onDelete: () => void
}) {
  const typeInfo = RELATIONSHIP_TYPES.find((t) => t.value === relationship.type)
  const DirectionIcon = relationship.bidirectional
    ? ArrowLeftRight
    : relationship.direction === 'outgoing'
    ? ArrowRight
    : ArrowLeft

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <DirectionIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/shards/${relationship.relatedShard?.id || relationship.targetShardId}`}
              className="font-medium hover:underline"
            >
              {relationship.relatedShard?.name || 'Unknown Shard'}
            </Link>
            <Badge variant="outline" className="text-xs">
              {typeInfo?.label || relationship.type}
            </Badge>
          </div>
          {relationship.label && (
            <p className="text-xs text-muted-foreground">{relationship.label}</p>
          )}
          {relationship.relatedShard?.shardTypeName && (
            <p className="text-xs text-muted-foreground">
              {relationship.relatedShard.shardTypeName}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {relationship.strength && (
          <Badge variant="secondary" className="text-xs">
            {Math.round(relationship.strength.value * 100)}%
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/shards/${relationship.relatedShard?.id || relationship.targetShardId}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Shard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

