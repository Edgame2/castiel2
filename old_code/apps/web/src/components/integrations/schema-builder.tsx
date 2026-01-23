'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  MoreVertical,
  Copy,
  Wand2,
  AlertCircle,
  CheckCircle2,
  ArrowDown,
  Code,
} from 'lucide-react';
import type {
  FieldMapping,
  FieldMappingType,
  TransformationType,
  Transformation,
  IntegrationEntity,
  IntegrationEntityField,
} from '@/types/integration.types';

interface SchemaBuilderProps {
  sourceEntity: IntegrationEntity | null;
  targetFields: Array<{ name: string; displayName: string; type: string; required: boolean }>;
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onTest?: (sampleData: Record<string, any>) => Promise<any>;
}

const MAPPING_TYPES: Array<{ value: FieldMappingType; label: string; description: string }> = [
  { value: 'direct', label: 'Direct', description: 'Map source field directly to target' },
  { value: 'transform', label: 'Transform', description: 'Apply transformations to source field' },
  { value: 'conditional', label: 'Conditional', description: 'Map based on conditions' },
  { value: 'default', label: 'Default', description: 'Use a default value' },
  { value: 'composite', label: 'Composite', description: 'Combine multiple fields' },
  { value: 'flatten', label: 'Flatten', description: 'Extract from nested object' },
  { value: 'lookup', label: 'Lookup', description: 'Look up value from reference' },
];

const TRANSFORMATION_TYPES: Array<{ value: TransformationType; label: string; category: string }> = [
  // String transformations
  { value: 'uppercase', label: 'Uppercase', category: 'String' },
  { value: 'lowercase', label: 'Lowercase', category: 'String' },
  { value: 'trim', label: 'Trim', category: 'String' },
  { value: 'truncate', label: 'Truncate', category: 'String' },
  { value: 'replace', label: 'Replace', category: 'String' },
  { value: 'regex_replace', label: 'Regex Replace', category: 'String' },
  { value: 'split', label: 'Split', category: 'String' },
  { value: 'concat', label: 'Concat', category: 'String' },
  // Number transformations
  { value: 'round', label: 'Round', category: 'Number' },
  { value: 'floor', label: 'Floor', category: 'Number' },
  { value: 'ceil', label: 'Ceil', category: 'Number' },
  { value: 'multiply', label: 'Multiply', category: 'Number' },
  { value: 'divide', label: 'Divide', category: 'Number' },
  { value: 'add', label: 'Add', category: 'Number' },
  { value: 'subtract', label: 'Subtract', category: 'Number' },
  { value: 'abs', label: 'Absolute', category: 'Number' },
  // Date transformations
  { value: 'parse_date', label: 'Parse Date', category: 'Date' },
  { value: 'format_date', label: 'Format Date', category: 'Date' },
  { value: 'add_days', label: 'Add Days', category: 'Date' },
  { value: 'to_timestamp', label: 'To Timestamp', category: 'Date' },
  { value: 'to_iso_string', label: 'To ISO String', category: 'Date' },
  // Type conversions
  { value: 'to_string', label: 'To String', category: 'Type' },
  { value: 'to_number', label: 'To Number', category: 'Type' },
  { value: 'to_boolean', label: 'To Boolean', category: 'Type' },
  { value: 'to_array', label: 'To Array', category: 'Type' },
  { value: 'to_date', label: 'To Date', category: 'Type' },
  { value: 'parse_json', label: 'Parse JSON', category: 'Type' },
  { value: 'stringify_json', label: 'Stringify JSON', category: 'Type' },
  // Custom
  { value: 'custom', label: 'Custom (JavaScript)', category: 'Advanced' },
];

export function SchemaBuilder({
  sourceEntity,
  targetFields,
  mappings,
  onMappingsChange,
  onTest,
}: SchemaBuilderProps) {
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testData, setTestData] = useState('{}');
  const [testResult, setTestResult] = useState<any>(null);

  const sourceFields = sourceEntity?.fields || [];

  const addMapping = useCallback((targetField: string) => {
    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      targetField,
      mappingType: 'direct',
      config: {
        type: 'direct',
        sourceField: '',
      },
    };
    onMappingsChange([...mappings, newMapping]);
    setEditingMapping(newMapping);
  }, [mappings, onMappingsChange]);

  const updateMapping = useCallback((id: string, updates: Partial<FieldMapping>) => {
    onMappingsChange(
      mappings.map(m => (m.id === id ? { ...m, ...updates } : m))
    );
    if (editingMapping?.id === id) {
      setEditingMapping(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [mappings, onMappingsChange, editingMapping]);

  const removeMapping = useCallback((id: string) => {
    onMappingsChange(mappings.filter(m => m.id !== id));
    if (editingMapping?.id === id) {
      setEditingMapping(null);
    }
  }, [mappings, onMappingsChange, editingMapping]);

  const duplicateMapping = useCallback((mapping: FieldMapping) => {
    const newMapping: FieldMapping = {
      ...mapping,
      id: `mapping-${Date.now()}`,
      targetField: `${mapping.targetField}_copy`,
    };
    onMappingsChange([...mappings, newMapping]);
  }, [mappings, onMappingsChange]);

  const autoMapFields = useCallback(() => {
    const existingTargetFields = new Set(mappings.map(m => m.targetField));
    const newMappings: FieldMapping[] = [...mappings];

    targetFields.forEach(targetField => {
      if (existingTargetFields.has(targetField.name)) return;

      // Try to find matching source field
      const matchingSource = sourceFields.find(
        sf => sf.name.toLowerCase() === targetField.name.toLowerCase() ||
              sf.displayName.toLowerCase() === targetField.displayName.toLowerCase()
      );

      if (matchingSource) {
        newMappings.push({
          id: `mapping-${Date.now()}-${targetField.name}`,
          targetField: targetField.name,
          mappingType: 'direct',
          config: {
            type: 'direct',
            sourceField: matchingSource.name,
          },
          required: targetField.required,
        });
      }
    });

    onMappingsChange(newMappings);
  }, [mappings, targetFields, sourceFields, onMappingsChange]);

  const handleTest = async () => {
    if (!onTest) return;
    try {
      const data = JSON.parse(testData);
      const result = await onTest(data);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    }
  };

  const getMappingForTarget = (targetField: string) => {
    return mappings.find(m => m.targetField === targetField);
  };

  const renderMappingConfig = (mapping: FieldMapping) => {
    const { mappingType, config } = mapping;

    switch (mappingType) {
      case 'direct':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Source Field</Label>
              <Select
                value={config.sourceField || ''}
                onValueChange={(value) => updateMapping(mapping.id, {
                  config: { ...config, sourceField: value },
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.displayName} ({field.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'transform':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Source Field</Label>
              <Select
                value={config.sourceField || ''}
                onValueChange={(value) => updateMapping(mapping.id, {
                  config: { ...config, sourceField: value },
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Transformations</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const transforms = config.transformations || [];
                    updateMapping(mapping.id, {
                      config: {
                        ...config,
                        transformations: [...transforms, { type: 'trim' }],
                      },
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {(config.transformations || []).map((transform: Transformation, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={transform.type}
                      onValueChange={(value) => {
                        const transforms = [...(config.transformations || [])];
                        transforms[index] = { ...transform, type: value as TransformationType };
                        updateMapping(mapping.id, {
                          config: { ...config, transformations: transforms },
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFORMATION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="text-muted-foreground text-xs mr-2">[{t.category}]</span>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const transforms = (config.transformations || []).filter((_: Transformation, i: number) => i !== index);
                        updateMapping(mapping.id, {
                          config: { ...config, transformations: transforms },
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'default':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Default Value</Label>
              <Input
                value={config.value ?? ''}
                onChange={(e) => updateMapping(mapping.id, {
                  config: { ...config, value: e.target.value },
                })}
                placeholder="Enter default value"
              />
            </div>
          </div>
        );

      case 'composite':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Source Fields</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  const fields = config.sourceFields || [];
                  if (!fields.includes(value)) {
                    updateMapping(mapping.id, {
                      config: { ...config, sourceFields: [...fields, value] },
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields
                    .filter(f => !(config.sourceFields || []).includes(f.name))
                    .map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2">
                {(config.sourceFields || []).map((field: string) => (
                  <Badge key={field} variant="secondary" className="gap-1">
                    {field}
                    <button
                      onClick={() => {
                        updateMapping(mapping.id, {
                          config: {
                            ...config,
                            sourceFields: (config.sourceFields || []).filter((f: string) => f !== field),
                          },
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template (use {'{field}'} placeholders)</Label>
              <Input
                value={config.template || ''}
                onChange={(e) => updateMapping(mapping.id, {
                  config: { ...config, template: e.target.value },
                })}
                placeholder="{firstName} {lastName}"
              />
            </div>
          </div>
        );

      case 'flatten':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Source Field</Label>
              <Select
                value={config.sourceField || ''}
                onValueChange={(value) => updateMapping(mapping.id, {
                  config: { ...config, sourceField: value },
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields
                    .filter(f => f.type === 'object')
                    .map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Path (e.g., address.city)</Label>
              <Input
                value={config.path || ''}
                onChange={(e) => updateMapping(mapping.id, {
                  config: { ...config, path: e.target.value },
                })}
                placeholder="nested.property.path"
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Configure {mappingType} mapping
          </p>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Field Mappings</h3>
          <p className="text-sm text-muted-foreground">
            Map fields from {sourceEntity?.displayName || 'source'} to your Shard type
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={autoMapFields}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Map
          </Button>
          {onTest && (
            <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
              <Code className="h-4 w-4 mr-2" />
              Test
            </Button>
          )}
        </div>
      </div>

      {/* Mapping grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Source fields */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Source Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceFields.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No source entity selected
              </p>
            ) : (
              sourceFields.map(field => {
                const isUsed = mappings.some(m => m.config.sourceField === field.name);
                return (
                  <div
                    key={field.name}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      isUsed ? 'border-green-500/30 bg-green-500/5' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{field.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.name} • {field.type}
                      </p>
                    </div>
                    {isUsed && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Target fields */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Target Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {targetFields.map(field => {
              const mapping = getMappingForTarget(field.name);
              const isMapped = !!mapping;

              return (
                <div
                  key={field.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    isMapped ? 'border-green-500/30 bg-green-500/5' : field.required ? 'border-amber-500/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isMapped ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : field.required ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : null}
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {field.displayName}
                          {field.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.name} • {field.type}
                        </p>
                      </div>
                    </div>

                    {isMapped ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMapping(mapping)}>
                            Edit Mapping
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMapping(mapping)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMapping(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addMapping(field.name)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Map
                      </Button>
                    )}
                  </div>

                  {isMapped && mapping && (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {mapping.mappingType}
                      </Badge>
                      {mapping.config.sourceField && (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span>{mapping.config.sourceField}</span>
                        </>
                      )}
                      {mapping.config.value !== undefined && (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-mono">{JSON.stringify(mapping.config.value)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Mapping editor dialog */}
      <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Field Mapping</DialogTitle>
            <DialogDescription>
              Set up how data is mapped to {editingMapping?.targetField}
            </DialogDescription>
          </DialogHeader>

          {editingMapping && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mapping Type</Label>
                <Select
                  value={editingMapping.mappingType}
                  onValueChange={(value) => updateMapping(editingMapping.id, {
                    mappingType: value as FieldMappingType,
                    config: { type: value as FieldMappingType },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAPPING_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {renderMappingConfig(editingMapping)}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMapping(null)}>
              Cancel
            </Button>
            <Button onClick={() => setEditingMapping(null)}>
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Schema Transformation</DialogTitle>
            <DialogDescription>
              Enter sample data to test how it will be transformed
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 py-4">
            <div className="space-y-2">
              <Label>Sample Input (JSON)</Label>
              <Textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="font-mono text-sm h-64"
                placeholder='{"field": "value"}'
              />
            </div>
            <div className="space-y-2">
              <Label>Transformed Output</Label>
              <Textarea
                value={testResult ? JSON.stringify(testResult, null, 2) : ''}
                readOnly
                className="font-mono text-sm h-64 bg-muted"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
            <Button onClick={handleTest}>
              <Code className="h-4 w-4 mr-2" />
              Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}











