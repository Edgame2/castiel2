'use client';

/**
 * Custom Integrations List Page
 * Lists all custom integrations and allows creating new ones
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomIntegrations, useDeleteCustomIntegration, useTestConnection } from '@/hooks/use-custom-integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Pencil, Trash2, TestTube2, Plug, Webhook, Globe, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

export default function CustomIntegrationsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useCustomIntegrations();
  const deleteIntegration = useDeleteCustomIntegration();
  const testConnection = useTestConnection();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (integrationToDelete) {
      await deleteIntegration.mutateAsync(integrationToDelete);
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await testConnection.mutateAsync(id);
    } finally {
      setTestingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rest_api':
        return <Globe className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'graphql':
        return <Plug className="h-4 w-4" />;
      default:
        return <Plug className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (integration: any) => {
    if (integration.status === 'active') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    if (integration.status === 'error') {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getTestResultBadge = (integration: any) => {
    if (!integration.lastTestResult) return null;

    if (integration.lastTestResult === 'success') {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Last test passed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-red-600 border-red-600">
        Last test failed
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>Failed to load custom integrations</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const integrations = data?.integrations || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your own API integrations
          </p>
        </div>
        <Link href="/integrations/custom/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Integration
          </Button>
        </Link>
      </div>

      {/* Integration Grid */}
      {integrations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No custom integrations yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Create your first custom integration to connect with external APIs, receive webhooks, or query GraphQL endpoints.
            </p>
            <Link href="/integrations/custom/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Integration
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getTypeIcon(integration.integrationType)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.displayName}</CardTitle>
                      <CardDescription className="text-xs uppercase tracking-wider">
                        {integration.integrationType.replace('_', ' ')}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/integrations/custom/${integration.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTest(integration.id)}>
                        <TestTube2 className="h-4 w-4 mr-2" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setIntegrationToDelete(integration.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {integration.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {integration.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(integration)}
                  {getTestResultBadge(integration)}
                  {testingId === integration.id && (
                    <Badge variant="outline">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </Badge>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                  <span className="truncate max-w-[200px]">{integration.baseUrl}</span>
                  <span>{integration.endpoints?.length || 0} endpoints</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this integration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}











