'use client';

import { useContacts } from '@/hooks/use-google-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, ExternalLink, RefreshCw, Loader2, Mail, Phone, Building } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface ContactsListProps {
  integrationId: string;
  limit?: number;
}

export function ContactsList({ integrationId, limit = 10 }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error, refetch, isRefetching } = useContacts(integrationId, {
    limit: 100, // Fetch more to allow filtering
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load contacts
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCount = data?.totalCount || 0;
  const allContacts = data?.recentContacts || [];

  // Filter contacts by search query
  const filteredContacts = searchQuery
    ? allContacts.filter(
        (contact) =>
          contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allContacts.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Contacts</CardTitle>
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Your Google Contacts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchQuery ? 'No contacts found' : 'No contacts'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
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
        )}

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link
              href="https://contacts.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Contacts
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







