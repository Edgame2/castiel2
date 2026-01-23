"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ConsentManager, CookiePreferences } from "@/lib/cookies/consent-manager"
import { toast } from "sonner"
import { Cookie, Info } from "lucide-react"

export function CookiePreferencesSettings() {
  const [preferences, setPreferences] = useState<CookiePreferences>(
    ConsentManager.getDefaultPreferences()
  )
  const [consentDate, setConsentDate] = useState<Date | null>(null)

  useEffect(() => {
    const saved = ConsentManager.getPreferences()
    if (saved) {
      setPreferences(saved)
    }

    const date = ConsentManager.getConsentDate()
    setConsentDate(date)
  }, [])

  const handleSave = () => {
    ConsentManager.savePreferences(preferences)
    toast.success("Cookie preferences saved", {
      description: "Your cookie preferences have been updated successfully.",
    })
  }

  const handleReset = () => {
    const defaultPrefs = ConsentManager.getDefaultPreferences()
    setPreferences(defaultPrefs)
    ConsentManager.savePreferences(defaultPrefs)
    toast.success("Preferences reset", {
      description: "Cookie preferences have been reset to defaults.",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            <CardTitle>Cookie Preferences</CardTitle>
          </div>
          <CardDescription>
            Manage how we use cookies to enhance your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {consentDate && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Last updated: {consentDate.toLocaleDateString()} at{" "}
                {consentDate.toLocaleTimeString()}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Necessary Cookies */}
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Necessary Cookies</Label>
                  <p className="text-sm text-muted-foreground">
                    Required for the website to function
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <p>
                    These cookies are essential for authentication, security, and basic
                    functionality. They cannot be disabled.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Analytics Cookies */}
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics" className="text-base font-semibold">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve our website
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p>
                  We use Azure Application Insights to collect anonymous usage data, performance
                  metrics, and error reports. This helps us identify issues and improve the
                  platform.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Page views and navigation patterns</li>
                  <li>Session duration and engagement</li>
                  <li>Performance and load times</li>
                  <li>Error tracking and diagnostics</li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* Marketing Cookies */}
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing" className="text-base font-semibold">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Used for targeted advertising
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p>
                  Marketing cookies track your browsing activity to show you relevant
                  advertisements across different websites and measure campaign effectiveness.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Personalized advertising</li>
                  <li>Retargeting campaigns</li>
                  <li>Social media integration</li>
                  <li>Campaign performance tracking</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium">Cookie Retention</h4>
            <p className="text-sm text-muted-foreground">
              Most cookies expire after your session ends or after a set period (typically 30-365
              days). You can clear cookies at any time through your browser settings.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-medium">Browser Controls</h4>
            <p className="text-sm text-muted-foreground">
              You can also manage cookies through your browser settings. Note that blocking
              certain cookies may impact website functionality.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-medium">More Information</h4>
            <p className="text-sm text-muted-foreground">
              For detailed information about how we use cookies, please read our{" "}
              <a href="/cookies" className="underline hover:text-foreground">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
