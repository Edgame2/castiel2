"use client"

import { EmailTemplateList } from "@/components/admin/email-templates/email-template-list"

export default function EmailTemplatesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground mt-2">
          Manage email templates for notifications, invitations, and alerts
        </p>
      </div>
      <EmailTemplateList />
    </div>
  )
}







