'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTenantIntegration,
  useIntegration,
  useConversionSchema,
  useUpdateConversionSchema,
  useDeleteConversionSchema,
  useTestConversionSchema,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import { SchemaBuilder } from '@/components/integrations/schema-builder';
import { ArrowLeft, Loader2, Save, Trash2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import type { FieldMapping, IntegrationEntity } from '@/types/integration.types';

export default function EditSchemaPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;
  const schemaId = params.schemaId as string;

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
  const [hasChanges, setHasChanges] = useState(false);

  // Data hooks
  const { data: tenantIntegration } = useTenantIntegration(integrationId);
  const { data: integration } = useIntegration(
    tenantIntegration?.integrationId || ''
  );
  const { data: schema, isLoading: loadingSchema } = useConversionSchema(integrationId, schemaId);
  const { data: shardTypes } = useShardTypes();

  const updateSchema = useUpdateConversionSchema();
  const deleteSchema = useDeleteConversionSchema();
  const testSchema = useTestConversionSchema();

  // Initialize form from schema data
  useEffect(() => {
    if (schema) {
      setName(schema.name);
      setDescription(schema.description || '');
      setSourceEntity(schema.source.entity);
      setTargetShardType(schema.target.shardTypeId);
      setCreateIfMissing(schema.target.createIfMissing);
      setUpdateIfExists(schema.target.updateIfExists);
      setDeleteIfRemoved(schema.target.deleteIfRemoved);
      setIsActive(schema.isActive);
      setFieldMappings(schema.fieldMappings);
    }
  }, [schema]);

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

  const handleSave = async () => {
    if (!name || !sourceEntity || !targetShardType) return;

    try {
      await updateSchema.mutateAsync({
        integrationId,
        schemaId,
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
          isActive,
        },
      });
      toast.success('Schema updated successfully');
      setHasChanges(false);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update schema', 3, {
        errorMessage: errorObj.message,
        integrationId,
        schemaId,
      })
      toast.error('Failed to update schema');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSchema.mutateAsync({ integrationId, schemaId });
      toast.success('Schema deleted');
      router.push(`/integrations/${integrationId}/configure`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to delete schema', 3, {
        errorMessage: errorObj.message,
        integrationId,
        schemaId,
      })
      toast.error('Failed to delete schema');
    }
  };

  const handleTest = async (sampleData: Record<string, any>) => {
    try {
      const result = await testSchema.mutateAsync({
        integrationId,
        schemaId,
        sampleData,
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  if (loadingSchema) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">Schema not found</h3>
          <p className="text-muted-foreground mb-4">
            This schema may have been deleted.
          </p>
          <Button asChild>
            <Link href={`/integrations/${integrationId}/configure`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Schema</h1>
            <p className="text-muted-foreground mt-1">
              Modify the conversion schema mapping
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Schema</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this schema? This action cannot be undone.
                  Any sync tasks using this schema will stop working.
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
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Schema name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Schema Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="e.g., Contacts to People"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      setIsActive(checked);
                      setHasChanges(true);
                    }}
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
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasChanges(true);
                }}
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
              Entity mapping configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Source Entity *</Label>
                <Select
                  value={sourceEntity}
                  onValueChange={(value) => {
                    setSourceEntity(value);
                    setHasChanges(true);
                  }}
                >
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
              </div>

              <div className="space-y-2">
                <Label>Target Shard Type *</Label>
                <Select
                  value={targetShardType}
                  onValueChange={(value) => {
                    setTargetShardType(value);
                    setHasChanges(true);
                  }}
                >
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
                    onCheckedChange={(checked) => {
                      setCreateIfMissing(checked);
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="createIfMissing" className="text-sm font-normal">
                    Create new records
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="updateIfExists"
                    checked={updateIfExists}
                    onCheckedChange={(checked) => {
                      setUpdateIfExists(checked);
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="updateIfExists" className="text-sm font-normal">
                    Update existing records
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="deleteIfRemoved"
                    checked={deleteIfRemoved}
                    onCheckedChange={(checked) => {
                      setDeleteIfRemoved(checked);
                      setHasChanges(true);
                    }}
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
                onMappingsChange={(mappings) => {
                  setFieldMappings(mappings);
                  setHasChanges(true);
                }}
                onTest={handleTest}
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
            onClick={handleSave}
            disabled={!name || !sourceEntity || !targetShardType || updateSchema.isPending || !hasChanges}
          >
            {updateSchema.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}











