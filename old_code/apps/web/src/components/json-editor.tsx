"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Code } from "lucide-react"

interface JsonEditorProps {
  value: any
  onChange: (value: any) => void
  readOnly?: boolean
  height?: string
  title?: string
  description?: string
}

/**
 * JSON Editor component with syntax validation
 * Provides a textarea-based editor for JSON data with real-time validation
 */
export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  height = "400px",
  title = "JSON Data",
  description,
}: JsonEditorProps) {
  const [jsonString, setJsonString] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)

  // Initialize JSON string from value
  useEffect(() => {
    try {
      setJsonString(JSON.stringify(value, null, 2))
      setError(null)
      setIsValid(true)
    } catch (err) {
      setJsonString("")
      setError("Invalid initial value")
      setIsValid(false)
    }
  }, [value])

  const handleChange = (newValue: string) => {
    setJsonString(newValue)

    // Try to parse the JSON
    try {
      const parsed = JSON.parse(newValue)
      setError(null)
      setIsValid(true)
      
      // Only call onChange if JSON is valid and not read-only
      if (!readOnly) {
        onChange(parsed)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid JSON"
      setError(errorMessage)
      setIsValid(false)
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonString)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonString(formatted)
      setError(null)
      setIsValid(true)
      if (!readOnly) {
        onChange(parsed)
      }
    } catch (err) {
      // If parsing fails, keep the current string
    }
  }

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(jsonString)
      const minified = JSON.stringify(parsed)
      setJsonString(minified)
      setError(null)
      setIsValid(true)
      if (!readOnly) {
        onChange(parsed)
      }
    } catch (err) {
      // If parsing fails, keep the current string
    }
  }

  const clearJson = () => {
    setJsonString("{}")
    setError(null)
    setIsValid(true)
    if (!readOnly) {
      onChange({})
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {title}
              {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={formatJson}
                disabled={!isValid}
              >
                Format
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={minifyJson}
                disabled={!isValid}
              >
                Minify
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearJson}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2">
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="mr-1 h-3 w-3" />
              {error}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Textarea
          value={jsonString}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          className="font-mono text-sm"
          style={{ height, minHeight: "200px" }}
          placeholder='{"key": "value"}'
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {jsonString.length} characters
          </span>
          {isValid && (
            <span className="text-green-600 dark:text-green-400">
              Valid JSON
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * JSON Viewer component for read-only display
 */
export function JsonViewer({
  data,
  title = "JSON Data",
  height = "400px",
}: {
  data: any
  title?: string
  height?: string
}) {
  return <JsonEditor value={data} onChange={() => {}} readOnly title={title} height={height} />
}
