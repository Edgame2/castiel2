"use client"

import { Users, Search, ExternalLink, RefreshCw, Loader2, Mail, Phone, Building, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { useContacts } from "@/hooks/use-google-workspace"
import { useState } from "react"
import Link from "next/link"

interface ContactsStatsWidgetProps {
  widget: Widget
  data: unknown
}

interface ContactsStatsData {
  totalCount: number
  recentContacts: Array<{
    resourceName: string
    displayName?: string
    email?: string
    phone?: string
    company?: string
  }>
}

export function ContactsStatsWidget({ widget, data }: ContactsStatsWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const integrationId = (widget.config as any)?.integrationId as string | undefined
  const limit = (widget.config as any)?.limit as number || 100

  const { data: contactsData, isLoading, error, refetch } = useContacts(integrationId || '', {
    limit,
  })

  // Use provided data or fetched data
  const stats = (data as ContactsStatsData) || contactsData
  const isLoadingData = !data && isLoading
  const hasError = !data && error

  const totalCount = stats?.totalCount || 0
  const allContacts = stats?.recentContacts || []

  // Filter contacts by search query
  const filteredContacts = searchQuery
    ? allContacts.filter(
        (contact) =>
          contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allContacts.slice(0, 5)

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Users className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load contacts</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-semibold">Contacts</span>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {searchQuery ? 'No contacts found' : 'No contacts'}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">
                    {contact.displayName || 'Unnamed Contact'}
                  </div>
                  <div className="space-y-1">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{contact.company}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1" size="sm" asChild>
          <Link
            href="https://contacts.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Contacts
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://contacts.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Add contact"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}







