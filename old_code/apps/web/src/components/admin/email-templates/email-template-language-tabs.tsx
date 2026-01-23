"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Globe, CheckCircle2, XCircle } from "lucide-react"
import { useTemplateLanguages, useDuplicateTemplate } from "@/hooks/use-email-templates"
import type { LanguageVariant } from "@/types/email-template"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EmailTemplateLanguageTabsProps {
  templateName: string
  currentLanguage: string
  onLanguageChange?: (language: string) => void
  tenantId?: string
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
]

export function EmailTemplateLanguageTabs({
  templateName,
  currentLanguage,
  onLanguageChange,
  tenantId,
}: EmailTemplateLanguageTabsProps) {
  const router = useRouter()
  const { data: languagesData, isLoading } = useTemplateLanguages(templateName, tenantId)
  const duplicateTemplate = useDuplicateTemplate()
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateLanguage, setDuplicateLanguage] = useState("")
  const [duplicateDisplayName, setDuplicateDisplayName] = useState("")

  const languages = languagesData?.languages || []
  const existingLanguageCodes = languages.map((l) => l.language)

  const handleDuplicate = async () => {
    if (!duplicateLanguage || !languages.length) return

    // Find the current template ID (use the first language as source, or current language)
    const sourceLanguage = languages.find((l) => l.language === currentLanguage) || languages[0]
    if (!sourceLanguage) {
      toast.error("Source template not found")
      return
    }

    try {
      await duplicateTemplate.mutateAsync({
        id: sourceLanguage.templateId,
        data: {
          language: duplicateLanguage,
          displayName: duplicateDisplayName || undefined,
        },
        tenantId,
      })
      setDuplicateDialogOpen(false)
      setDuplicateLanguage("")
      setDuplicateDisplayName("")
      router.refresh()
    } catch (error) {
      // Error handled by hook
    }
  }

  const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase()
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading languages...</div>
  }

  return (
    <div className="space-y-4">
      <Tabs value={currentLanguage} onValueChange={onLanguageChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            {languages.map((lang) => (
              <TabsTrigger key={lang.language} value={lang.language} className="flex items-center gap-2">
                <span>{getLanguageName(lang.language)}</span>
                {lang.isActive ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Language
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Duplicate Template to New Language</DialogTitle>
                <DialogDescription>
                  Create a copy of this template in another language
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={duplicateLanguage} onValueChange={setDuplicateLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.filter(
                        (lang) => !existingLanguageCodes.includes(lang.code)
                      ).map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name} ({lang.code.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Display Name (Optional)</Label>
                  <Input
                    value={duplicateDisplayName}
                    onChange={(e) => setDuplicateDisplayName(e.target.value)}
                    placeholder="Leave empty to use same name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDuplicate}
                    disabled={!duplicateLanguage || duplicateTemplate.isPending}
                  >
                    {duplicateTemplate.isPending ? "Duplicating..." : "Duplicate"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {languages.map((lang) => (
          <TabsContent key={lang.language} value={lang.language}>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getLanguageName(lang.language)}</span>
                  <Badge variant={lang.isActive ? "default" : "secondary"}>
                    {lang.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(lang.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/email-templates/${lang.templateId}`)}
              >
                Edit
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {languages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No language variants found</p>
        </div>
      )}
    </div>
  )
}







