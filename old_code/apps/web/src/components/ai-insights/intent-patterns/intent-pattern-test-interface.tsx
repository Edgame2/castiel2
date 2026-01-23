"use client"

import { useState } from "react"
import { useTestIntentPattern } from "@/hooks/use-insights"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, Plus, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface IntentPattern {
  id: string
  name: string
  intentType: string
  patterns: string[]
  keywords: string[]
  phrases: string[]
  excludePatterns?: string[]
  confidenceWeight?: number
}

interface IntentPatternTestInterfaceProps {
  pattern: IntentPattern
  onClose?: () => void
}

export function IntentPatternTestInterface({
  pattern,
  onClose,
}: IntentPatternTestInterfaceProps) {
  const [testQueries, setTestQueries] = useState<string[]>([""])
  const testMutation = useTestIntentPattern()
  const [results, setResults] = useState<any[] | null>(null)

  const handleAddQuery = () => {
    setTestQueries([...testQueries, ""])
  }

  const handleRemoveQuery = (index: number) => {
    setTestQueries(testQueries.filter((_, i) => i !== index))
  }

  const handleQueryChange = (index: number, value: string) => {
    const newQueries = [...testQueries]
    newQueries[index] = value
    setTestQueries(newQueries)
  }

  const handleTest = async () => {
    const queries = testQueries.filter(q => q.trim())
    if (queries.length === 0) {
      return
    }

    try {
      const result = await testMutation.mutateAsync({
        pattern: {
          intentType: pattern.intentType,
          patterns: pattern.patterns,
          keywords: pattern.keywords,
          phrases: pattern.phrases,
          excludePatterns: pattern.excludePatterns,
          confidenceWeight: pattern.confidenceWeight,
        },
        testQueries: queries,
      })
      setResults(result.results || [])
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Test failed", 3, {
        errorMessage: errorObj.message,
        patternId: pattern?.id,
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Intent Pattern</CardTitle>
            <CardDescription>
              Test pattern: {pattern.name}
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Test Queries</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddQuery}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Query
            </Button>
          </div>
          {testQueries.map((query, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={query}
                onChange={(e) => handleQueryChange(index, e.target.value)}
                placeholder="Enter a test query..."
                className="min-h-[60px]"
              />
              {testQueries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQuery(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleTest}
          disabled={testMutation.isPending || testQueries.filter(q => q.trim()).length === 0}
          className="w-full"
        >
          {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Play className="mr-2 h-4 w-4" />
          Run Test
        </Button>

        {results && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Intent Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{result.query}</TableCell>
                      <TableCell>
                        <Badge variant={result.matched ? "default" : "secondary"}>
                          {result.matched ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(result.confidence * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.intentType}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}






