"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConsentManager, CookiePreferences } from "@/lib/cookies/consent-manager"

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(
    ConsentManager.getDefaultPreferences()
  )

  useEffect(() => {
    // Check if user has already given consent
    if (!ConsentManager.hasConsent()) {
      setShowBanner(true)
    } else {
      // Load saved preferences
      const saved = ConsentManager.getPreferences()
      if (saved) {
        setPreferences(saved)
      }
    }
  }, [])

  const acceptAll = () => {
    const allAccepted = ConsentManager.getAllAcceptedPreferences()
    ConsentManager.savePreferences(allAccepted)
    setShowBanner(false)
  }

  const acceptNecessary = () => {
    const necessaryOnly = ConsentManager.getDefaultPreferences()
    ConsentManager.savePreferences(necessaryOnly)
    setShowBanner(false)
  }

  const handleSavePreferences = () => {
    ConsentManager.savePreferences(preferences)
    setShowPreferences(false)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      <Card className="fixed bottom-4 left-4 right-4 z-50 p-6 shadow-lg md:left-auto md:right-4 md:max-w-md">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Cookie Consent</h3>
            <p className="text-sm text-muted-foreground">
              We use cookies to enhance your experience. By continuing to visit this site you
              agree to our use of cookies.{" "}
              <Link href="/cookies" className="underline hover:text-foreground">
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={acceptAll} className="flex-1">
              Accept All
            </Button>
            <Button onClick={acceptNecessary} variant="outline" className="flex-1">
              Necessary Only
            </Button>
            <Button
              onClick={() => {
                setShowBanner(false)
                setShowPreferences(true)
              }}
              variant="ghost"
              className="flex-1"
            >
              Customize
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Choose which types of cookies you want to allow. You can change these settings at
              any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Checkbox checked disabled className="mt-1" />
              <div className="flex-1">
                <p className="font-medium">Necessary Cookies</p>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function properly. These cookies enable basic
                  features like authentication and security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: !!checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-medium">Analytics Cookies</p>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors use our website by collecting anonymous usage
                  data and performance metrics.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: !!checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-medium">Marketing Cookies</p>
                <p className="text-sm text-muted-foreground">
                  Used to track visitors across websites to display relevant advertisements and
                  measure campaign effectiveness.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreferences}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
