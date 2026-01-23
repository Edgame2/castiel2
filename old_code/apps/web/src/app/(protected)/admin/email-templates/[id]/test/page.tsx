"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useEmailTemplate, useTestEmailTemplate } from "@/hooks/use-email-templates"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: template, isLoading } = useEmailTemplate(id)
  const testTemplate = useTestEmailTemplate()
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    if (!template) return
    try {
      const testResult = await testTemplate.mutateAsync({
        id: template.id,
        data: { placeholders },
      })
      setResult(testResult)
    } catch (error) {
      // Error handled by hook
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <p>Template not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Email Template</h1>
        <p className="text-muted-foreground mt-2">
          {template.displayName} ({template.language.toUpperCase()})
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Placeholder Values</CardTitle>
            <CardDescription>
              Enter test values for placeholders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.placeholders.map((placeholder) => (
              <div key={placeholder.name} className="space-y-2">
                <Label>
                  {placeholder.name}
                  {placeholder.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  value={placeholders[placeholder.name] || ""}
                  onChange={(e) =>
                    setPlaceholders({ ...placeholders, [placeholder.name]: e.target.value })
                  }
                  placeholder={placeholder.example || placeholder.description}
                />
                <p className="text-xs text-muted-foreground">{placeholder.description}</p>
              </div>
            ))}
            <Button onClick={handleTest} disabled={testTemplate.isPending} className="w-full">
              {testTemplate.isPending ? "Testing..." : "Test Template"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Rendered email preview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <div className="p-3 border rounded-lg bg-muted">
                    {result.subject}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>HTML Body</Label>
                  <div
                    className="p-3 border rounded-lg bg-muted max-h-64 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: result.htmlBody }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Text Body</Label>
                  <div className="p-3 border rounded-lg bg-muted max-h-64 overflow-auto whitespace-pre-wrap">
                    {result.textBody}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Placeholder Status</Label>
                  <div className="space-y-1">
                    {result.placeholders.provided.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Provided: </span>
                        {result.placeholders.provided.map((p: string) => (
                          <Badge key={p} variant="default" className="mr-1">{p}</Badge>
                        ))}
                      </div>
                    )}
                    {result.placeholders.missing.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-destructive">Missing: </span>
                        {result.placeholders.missing.map((p: string) => (
                          <Badge key={p} variant="destructive" className="mr-1">{p}</Badge>
                        ))}
                      </div>
                    )}
                    {result.placeholders.unused.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Unused: </span>
                        {result.placeholders.unused.map((p: string) => (
                          <Badge key={p} variant="secondary" className="mr-1">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Click "Test Template" to see the rendered result
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}







