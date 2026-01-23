"use client"

import { useState } from "react"
import { useIntentPatterns, useDeleteIntentPattern } from "@/hooks/use-insights"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Loader2, Edit, Trash2, TestTube } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IntentPattern {
  id: string
  name: string
  description: string
  intentType: string
  subtype?: string
  patterns: string[]
  keywords: string[]
  phrases: string[]
  priority: number
  confidenceWeight: number
  isActive: boolean
  metrics: {
    totalMatches: number
    accuracyRate: number
    avgConfidence: number
    lastMatched?: string
  }
  createdAt: string
  updatedAt: string
}

interface IntentPatternsListWidgetProps {
  onEditPattern?: (pattern: IntentPattern) => void
  onCreatePattern?: () => void
  onTestPattern?: (pattern: IntentPattern) => void
}

export function IntentPatternsListWidget({
  onEditPattern,
  onCreatePattern,
  onTestPattern,
}: IntentPatternsListWidgetProps) {
  const [search, setSearch] = useState("")
  const [intentType, setIntentType] = useState<string>("")
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading, error } = useIntentPatterns({
    intentType: intentType || undefined,
    isActive,
    sortBy: 'priority',
  })

  const deleteMutation = useDeleteIntentPattern()

  const patterns = data?.patterns || []

  const filteredPatterns = patterns.filter((pattern: IntentPattern) => {
    if (search && !pattern.name.toLowerCase().includes(search.toLowerCase()) &&
        !pattern.description.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={intentType}
              onChange={(e) => setIntentType(e.target.value)}
            >
              <option value="">All Intent Types</option>
              <option value="summary">Summary</option>
              <option value="analysis">Analysis</option>
              <option value="comparison">Comparison</option>
              <option value="recommendation">Recommendation</option>
              <option value="prediction">Prediction</option>
              <option value="extraction">Extraction</option>
              <option value="search">Search</option>
              <option value="generation">Generation</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={isActive === undefined ? "" : String(isActive)}
              onChange={(e) => setIsActive(e.target.value === "" ? undefined : e.target.value === "true")}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            {onCreatePattern && (
              <Button onClick={onCreatePattern}>
                <Plus className="mr-2 h-4 w-4" />
                New Pattern
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Intent Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading patterns...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-red-500">
                    Failed to load patterns
                  </TableCell>
                </TableRow>
              ) : filteredPatterns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No patterns found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatterns.map((pattern: IntentPattern) => (
                  <TableRow key={pattern.id}>
                    <TableCell className="font-medium">{pattern.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pattern.intentType}</Badge>
                      {pattern.subtype && (
                        <Badge variant="secondary" className="ml-2">{pattern.subtype}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{pattern.priority}</TableCell>
                    <TableCell>
                      {(pattern.metrics.accuracyRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{pattern.metrics.totalMatches}</TableCell>
                    <TableCell>
                      <Badge variant={pattern.isActive ? "default" : "secondary"}>
                        {pattern.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(pattern.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onTestPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTestPattern(pattern)}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                        )}
                        {onEditPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditPattern(pattern)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(pattern.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Intent Pattern</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this intent pattern? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}






