'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTenantIntegration,
  useIntegration,
  useCreateConversionSchema,
} from '@/hooks/use-integrations';
import { useShardTypes } from '@/hooks/use-shard-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SchemaBuilder } from '@/components/integrations/schema-builder';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { FieldMapping, IntegrationEntity } from '@/types/integration.types';

export default function NewSchemaPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceEntity, setSourceEntity] = useState('');
  const [targetShardType, setTargetShardType] = useState('');
  const [createIfMissing, setCreateIfMissing] = useState(true);
  const [updateIfExists, setUpdateIfExists] = useState(true);
  const [deleteIfRemoved, setDeleteIfRemoved] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Data hooks
  const { data: tenantIntegration } = useTenantIntegration(integrationId);
  const { data: integration } = useIntegration(
    tenantIntegration?.integrationId || ''
  );
  const { data: shardTypes } = useShardTypes();
  const createSchema = useCreateConversionSchema();

  const availableEntities = integration?.availableEntities || [];
  const selectedEntity = availableEntities.find(e => e.name === sourceEntity);
  const selectedShardType = shardTypes?.items?.find(st => st.id === targetShardType);

  // Get target fields from shard type schema
  const targetFields = selectedShardType?.schema
    ? Object.entries((selectedShardType.schema as any).properties || {}).map(([name, def]: [string, any]) => ({
        name,
        displayName: def.title || name,
        type: def.type || 'string',
        required: ((selectedShardType.schema as any).required || []).includes(name),
      }))
    : [];

  const handleSubmit = async () => {
    if (!name || !sourceEntity || !targetShardType) return;

    try {
      await createSchema.mutateAsync({
        integrationId,
        data: {
          name,
          description,
          source: {
            entity: sourceEntity,
          },
          target: {
            shardTypeId: targetShardType,
            createIfMissing,
            updateIfExists,
            deleteIfRemoved,
          },
          fieldMappings,
          deduplication: {
            strategy: 'external_id',
            externalIdField: 'Id',
          },
          isActive,
        },
      });
      router.push(`/integrations/${integrationId}/configure`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to create schema', 3, {
        errorMessage: errorObj.message,
        integrationId,
      })
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/integrations/${integrationId}/configure`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Configuration
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">New Conversion Schema</h1>
        <p className="text-muted-foreground mt-1">
          Define how data from {integration?.displayName || 'the integration'} maps to your Shard types
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your schema a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Schema Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Contacts to People"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active" className="text-sm font-normal">
                    {isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this schema does..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Source and Target */}
        <Card>
          <CardHeader>
            <CardTitle>Source & Target</CardTitle>
            <CardDescription>
              Choose which entity to sync and where to store it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Source Entity *</Label>
                <Select value={sourceEntity} onValueChange={setSourceEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEntities.map(entity => (
                      <SelectItem key={entity.name} value={entity.name}>
                        {entity.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEntity && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEntity.fields.length} fields available
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Shard Type *</Label>
                <Select value={targetShardType} onValueChange={setTargetShardType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shard type" />
                  </SelectTrigger>
                  <SelectContent>
                    {shardTypes?.items?.map(st => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.displayName || st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Sync Options</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="createIfMissing"
                    checked={createIfMissing}
                    onCheckedChange={setCreateIfMissing}
                  />
                  <Label htmlFor="createIfMissing" className="text-sm font-normal">
                    Create new records
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="updateIfExists"
                    checked={updateIfExists}
                    onCheckedChange={setUpdateIfExists}
                  />
                  <Label htmlFor="updateIfExists" className="text-sm font-normal">
                    Update existing records
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="deleteIfRemoved"
                    checked={deleteIfRemoved}
                    onCheckedChange={setDeleteIfRemoved}
                  />
                  <Label htmlFor="deleteIfRemoved" className="text-sm font-normal">
                    Delete removed records
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Mappings */}
        {sourceEntity && targetShardType && (
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Map fields from {selectedEntity?.displayName} to {selectedShardType?.displayName || targetShardType}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaBuilder
                sourceEntity={selectedEntity || null}
                targetFields={targetFields}
                mappings={fieldMappings}
                onMappingsChange={setFieldMappings}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/integrations/${integrationId}/configure`}>
              Cancel
            </Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !sourceEntity || !targetShardType || createSchema.isPending}
          >
            {createSchema.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create Schema
          </Button>
        </div>
      </div>
    </div>
  );
}











