'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { IntegrationProviderDocument } from '@/types/integration';

interface IntegrationProviderCardProps {
  provider: IntegrationProviderDocument;
  onEdit?: () => void;
  onDelete?: () => void;
  onChangeStatus?: () => void;
  onChangeAudience?: () => void;
}

export function IntegrationProviderCard({
  provider,
  onEdit,
  onDelete,
  onChangeStatus,
  onChangeAudience,
}: IntegrationProviderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: provider.color || '#6b7280' }}
            >
              <span className="text-white text-lg">{provider.icon || '🔌'}</span>
            </div>
            <div>
              <CardTitle>{provider.displayName}</CardTitle>
              <CardDescription>{provider.provider}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onChangeStatus}>Change Status</DropdownMenuItem>
              <DropdownMenuItem onClick={onChangeAudience}>Change Audience</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{provider.category}</Badge>
            <Badge
              variant={
                provider.status === 'active'
                  ? 'default'
                  : provider.status === 'beta'
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {provider.status}
            </Badge>
            <Badge variant="outline">{provider.audience}</Badge>
            {provider.supportsSearch && <Badge variant="outline">Search</Badge>}
            {provider.requiresUserScoping && <Badge variant="outline">User Scoped</Badge>}
          </div>
          {provider.description && (
            <p className="text-sm text-muted-foreground">{provider.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}







