'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IntegrationDocument, IntegrationProviderDocument } from '@/types/integration';

interface IntegrationFormProps {
  provider?: IntegrationProviderDocument;
  integration?: IntegrationDocument;
  onSubmit: (data: {
    name: string;
    description?: string;
    searchEnabled?: boolean;
    userScoped?: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function IntegrationForm({
  provider,
  integration,
  onSubmit,
  onCancel,
  isLoading = false,
}: IntegrationFormProps) {
  const [name, setName] = useState(integration?.name || '');
  const [description, setDescription] = useState(integration?.description || '');
  const [searchEnabled, setSearchEnabled] = useState(integration?.searchEnabled || false);
  const [userScoped, setUserScoped] = useState(integration?.userScoped || false);

  useEffect(() => {
    if (integration) {
      setName(integration.name);
      setDescription(integration.description || '');
      setSearchEnabled(integration.searchEnabled || false);
      setUserScoped(integration.userScoped || false);
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit({
      name,
      description: description || undefined,
      searchEnabled,
      userScoped,
    });
  };

  const isFormValid = name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            {provider
              ? `Configure your ${provider.displayName} integration instance.`
              : 'Configure your integration instance.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Integration Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Salesforce - Sales Team"
              required
            />
            <p className="text-xs text-muted-foreground">
              A unique name to identify this integration instance.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this integration instance"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {provider && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Configure integration-specific settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {provider.supportsSearch && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="searchEnabled"
                  checked={searchEnabled}
                  onCheckedChange={(checked) => setSearchEnabled(checked === true)}
                />
                <Label htmlFor="searchEnabled" className="text-sm font-normal cursor-pointer">
                  Enable search for this integration
                </Label>
              </div>
            )}

            {provider.requiresUserScoping && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="userScoped"
                  checked={userScoped}
                  onCheckedChange={(checked) => setUserScoped(checked === true)}
                />
                <Label htmlFor="userScoped" className="text-sm font-normal cursor-pointer">
                  User-scoped integration (each user connects their own account)
                </Label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!isFormValid || isLoading}>
          {isLoading ? 'Saving...' : integration ? 'Update Integration' : 'Create Integration'}
        </Button>
      </div>
    </form>
  );
}







