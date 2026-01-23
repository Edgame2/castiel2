"use client"

import { useRouter } from "next/navigation"
import { EmailTemplateForm } from "@/components/admin/email-templates/email-template-form"

export default function NewEmailTemplatePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Email Template</h1>
        <p className="text-muted-foreground mt-2">
          Create a new email template for notifications, invitations, or alerts
        </p>
      </div>
      <EmailTemplateForm onSuccess={() => router.push("/admin/email-templates")} />
    </div>
  )
}







