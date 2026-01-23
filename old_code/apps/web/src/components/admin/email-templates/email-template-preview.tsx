"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Monitor, Mail } from "lucide-react"
import type { EmailTemplate, TemplateTestResult } from "@/types/email-template"

interface EmailTemplatePreviewProps {
  template?: EmailTemplate
  testResult?: TemplateTestResult
  mode?: "desktop" | "mobile"
  onModeChange?: (mode: "desktop" | "mobile") => void
}

export function EmailTemplatePreview({
  template,
  testResult,
  mode = "desktop",
  onModeChange,
}: EmailTemplatePreviewProps) {
  const [showHtml, setShowHtml] = useState(true)

  const subject = testResult?.subject || template?.subject || ""
  const htmlBody = testResult?.htmlBody || template?.htmlBody || ""
  const textBody = testResult?.textBody || template?.textBody || ""

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={mode === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange?.("desktop")}
          >
            <Monitor className="mr-2 h-4 w-4" />
            Desktop
          </Button>
          <Button
            variant={mode === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange?.("mobile")}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Mobile
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showHtml ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHtml(true)}
          >
            HTML
          </Button>
          <Button
            variant={!showHtml ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHtml(false)}
          >
            Text
          </Button>
        </div>
      </div>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Preview
              </CardTitle>
              <CardDescription>
                {mode === "desktop" ? "Desktop view" : "Mobile view"}
              </CardDescription>
            </div>
            {testResult && (
              <div className="flex gap-2">
                {testResult.placeholders.missing.length > 0 && (
                  <Badge variant="destructive">
                    {testResult.placeholders.missing.length} missing
                  </Badge>
                )}
                {testResult.placeholders.unused.length > 0 && (
                  <Badge variant="secondary">
                    {testResult.placeholders.unused.length} unused
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`border rounded-lg bg-white ${
              mode === "mobile" ? "max-w-sm mx-auto" : "w-full"
            }`}
          >
            {/* Email Header Simulation */}
            <div className="border-b p-4 bg-gray-50">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">From:</div>
                <div className="font-medium">
                  {template?.fromName || "App Name"} &lt;
                  {template?.fromEmail || "noreply@example.com"}&gt;
                </div>
                {template?.replyTo && (
                  <div className="text-sm text-muted-foreground">
                    Reply-To: {template.replyTo}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="border-b p-4">
              <div className="text-sm text-muted-foreground mb-1">Subject:</div>
              <div className="font-semibold">{subject || "(No subject)"}</div>
            </div>

            {/* Body */}
            <div className={`p-4 ${mode === "mobile" ? "text-sm" : ""}`}>
              {showHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlBody }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">{textBody}</pre>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder Status */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Placeholder Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResult.placeholders.provided.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Provided Placeholders:</div>
                <div className="flex flex-wrap gap-2">
                  {testResult.placeholders.provided.map((p) => (
                    <Badge key={p} variant="default">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {testResult.placeholders.missing.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 text-destructive">
                  Missing Required Placeholders:
                </div>
                <div className="flex flex-wrap gap-2">
                  {testResult.placeholders.missing.map((p) => (
                    <Badge key={p} variant="destructive">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {testResult.placeholders.unused.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">
                  Unused Placeholders:
                </div>
                <div className="flex flex-wrap gap-2">
                  {testResult.placeholders.unused.map((p) => (
                    <Badge key={p} variant="secondary">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}







