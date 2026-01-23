"use client"

import Link from "next/link"
import { FileDown, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DataPrivacySettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            <CardTitle>Data Export</CardTitle>
          </div>
          <CardDescription>
            Download a copy of your personal data in compliance with GDPR Article 20
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Request a complete export of all your data including profile information, shards,
            audit logs, and metadata. Exports are provided in JSON format and are typically ready
            within a few minutes.
          </p>
          <Link href="/settings/data-export">
            <Button>
              <FileDown className="mr-2 h-4 w-4" />
              Manage Data Exports
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            <CardTitle>Account Deletion</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Under GDPR Article 17 (Right to Erasure), you can request permanent deletion of your
            account and all personal data. This action includes a 30-day grace period during which
            you can cancel the request.
          </p>
          <Link href="/settings/data-deletion">
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Account Deletion
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Privacy Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="mb-1 font-medium text-foreground">Right to Access (Art. 15)</p>
            <p>
              You have the right to access your personal data and information about how we process
              it.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">Right to Portability (Art. 20)</p>
            <p>
              You have the right to receive your data in a structured, commonly used format and
              transfer it to another controller.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">Right to Erasure (Art. 17)</p>
            <p>
              You have the right to request deletion of your personal data under certain
              circumstances.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">Right to Rectification (Art. 16)</p>
            <p>
              You have the right to correct inaccurate personal data. You can update your profile
              information at any time in the Profile tab.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">More Information</p>
            <p>
              For more details about how we handle your data, please see our{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
