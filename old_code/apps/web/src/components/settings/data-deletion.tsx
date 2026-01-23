"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useRequestAccountDeletion,
  useCancelAccountDeletion,
} from "@/hooks/use-data-export"

export function DataDeletion() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [reason, setReason] = useState("")
  const requestDeletion = useRequestAccountDeletion()
  const cancelDeletion = useCancelAccountDeletion()

  const handleRequestDeletion = async () => {
    await requestDeletion.mutateAsync(reason)
    setShowConfirmDialog(false)
    setReason("")
  }

  const handleCancelDeletion = async () => {
    await cancelDeletion.mutateAsync()
  }

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. All your data will be permanently deleted, including:
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Your profile and account information</li>
                <li>All shards and shard types you've created</li>
                <li>API keys and integration settings</li>
                <li>Audit logs and activity history</li>
                <li>All files and attachments</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Before you proceed:</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  Consider exporting your data first using the{" "}
                  <a href="/settings/data-export" className="underline hover:text-foreground">
                    Data Export
                  </a>{" "}
                  feature
                </li>
                <li>
                  Review and cancel any active subscriptions or billing commitments
                </li>
                <li>
                  Inform team members if you're the organization owner (transfer ownership first)
                </li>
                <li>
                  Account deletion requests are processed after a 30-day grace period
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-medium">GDPR Right to Erasure:</h4>
              <p className="text-sm text-muted-foreground">
                Under GDPR Article 17, you have the right to request deletion of your personal
                data. We will delete all your data within 30 days of your request, except where we
                have a legal obligation to retain it.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="destructive"
                onClick={() => setShowConfirmDialog(true)}
                disabled={requestDeletion.isPending}
              >
                {requestDeletion.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancelDeletion}
                disabled={cancelDeletion.isPending}
              >
                {cancelDeletion.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Pending Deletion"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete your account and all associated data after a
              30-day grace period. During this time, you can cancel the deletion request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for deletion (optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Help us improve by telling us why you're leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Your feedback helps us improve our service
              </p>
            </div>

            <Alert variant="destructive">
              <AlertDescription>
                <p className="mb-2 font-medium">
                  By confirming, you understand that:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>Your account will be deleted in 30 days</li>
                  <li>All your data will be permanently erased</li>
                  <li>This action cannot be undone after the grace period</li>
                  <li>You will receive a confirmation email</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={requestDeletion.isPending}
            >
              {requestDeletion.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
