'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Settings, Power, PowerOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { IntegrationDocument } from '@/types/integration';

interface IntegrationCardProps {
  integration: IntegrationDocument;
  onEdit?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onTestConnection?: () => void;
}

export function IntegrationCard({
  integration,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onTestConnection,
}: IntegrationCardProps) {
  const isActive = integration.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {integration.icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <span className="text-lg">{integration.icon}</span>
              </div>
            )}
            <div>
              <CardTitle>{integration.name}</CardTitle>
              <CardDescription>{integration.providerName}</CardDescription>
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
              <DropdownMenuItem onClick={onTestConnection}>Test Connection</DropdownMenuItem>
              {isActive ? (
                <DropdownMenuItem onClick={onDeactivate}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onActivate}>
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
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
            <Badge
              variant={
                integration.status === 'connected'
                  ? 'default'
                  : integration.status === 'error'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {integration.status}
            </Badge>
            {integration.connectionStatus && (
              <Badge
                variant={
                  integration.connectionStatus === 'active' ? 'default' : 'destructive'
                }
              >
                {integration.connectionStatus}
              </Badge>
            )}
            {integration.searchEnabled && <Badge variant="outline">Search Enabled</Badge>}
            {integration.userScoped && <Badge variant="outline">User Scoped</Badge>}
          </div>
          {integration.description && (
            <p className="text-sm text-muted-foreground">{integration.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}







