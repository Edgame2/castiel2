"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { EmailTemplateForm } from "@/components/admin/email-templates/email-template-form"
import { EmailTemplateLanguageTabs } from "@/components/admin/email-templates/email-template-language-tabs"
import { useEmailTemplate } from "@/hooks/use-email-templates"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: template, isLoading } = useEmailTemplate(id)

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
        <h1 className="text-3xl font-bold">Edit Email Template</h1>
        <p className="text-muted-foreground mt-2">
          {template.displayName} ({template.language.toUpperCase()})
        </p>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">Edit Template</TabsTrigger>
          <TabsTrigger value="languages">Language Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <EmailTemplateForm template={template} onSuccess={() => router.push("/admin/email-templates")} />
        </TabsContent>

        <TabsContent value="languages">
          <EmailTemplateLanguageTabs
            templateName={template.name}
            currentLanguage={template.language}
            onLanguageChange={(lang) => {
              // Find template ID for the selected language and navigate
              // This would require fetching languages first
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}







