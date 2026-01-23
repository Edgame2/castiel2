"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Plus, Search, Filter, MoreVertical, Edit, Trash, Copy, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useEmailTemplates, useDeleteEmailTemplate, useUpdateTemplateStatus } from "@/hooks/use-email-templates"
import type { EmailTemplate } from "@/types/email-template"
import { toast } from "sonner"

interface EmailTemplateListProps {
  onEdit?: (template: EmailTemplate) => void
  onTest?: (template: EmailTemplate) => void
  onDuplicate?: (template: EmailTemplate) => void
}

export function EmailTemplateList({ onEdit, onTest, onDuplicate }: EmailTemplateListProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [languageFilter, setLanguageFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(true)

  const { data, isLoading } = useEmailTemplates({
    search: search || undefined,
    category: categoryFilter as any,
    language: languageFilter,
    isActive: statusFilter,
    limit: 50,
    offset: 0,
  })

  const deleteTemplate = useDeleteEmailTemplate()
  const updateStatus = useUpdateTemplateStatus()

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.displayName}"?`)) {
      return
    }
    deleteTemplate.mutate({ id: template.id })
  }

  const handleToggleStatus = (template: EmailTemplate) => {
    updateStatus.mutate({
      id: template.id,
      isActive: !template.isActive,
    })
  }

  const templates = data?.templates || []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="notifications">Notifications</SelectItem>
            <SelectItem value="invitations">Invitations</SelectItem>
            <SelectItem value="alerts">Alerts</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={languageFilter || "all"} onValueChange={(v) => setLanguageFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"} 
                onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v === "active")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => router.push("/admin/email-templates/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No email templates found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.displayName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/email-templates/${template.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/email-templates/${template.id}/test`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(template)}>
                          {template.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(template)}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}







