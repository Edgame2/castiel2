/**
 * Widget Catalog Form Component
 * SuperAdmin form for creating and editing widget types
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCreateWidgetCatalogEntry,
  useUpdateWidgetCatalogEntry,
  useWidgetCatalogEntry,
} from '@/hooks/use-widget-catalog';
import { WidgetType } from '@castiel/shared-types';
import { WidgetCatalogStatus, WidgetVisibilityLevel } from '@/types/widget-catalog';
import { Loader2 } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const WidgetFormSchema = z.object({
  widgetType: z.nativeEnum(WidgetType),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Only lowercase alphanumeric, hyphens, and underscores'),
  displayName: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
  icon: z.string().optional(),
  thumbnail: z.string().optional(),
  defaultWidth: z.number().int().min(1).max(12),
  defaultHeight: z.number().int().min(1).max(8),
  visibilityLevel: z.nativeEnum(WidgetVisibilityLevel),
  isDefault: z.boolean(),
  isFeatured: z.boolean(),
  status: z.nativeEnum(WidgetCatalogStatus),
});

type WidgetFormValues = z.infer<typeof WidgetFormSchema>;

interface WidgetCatalogFormProps {
  mode: 'create' | 'edit';
  widgetId?: string;
}

export function WidgetCatalogForm({ mode, widgetId }: WidgetCatalogFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing widget if editing
  const { data: existingWidget, isLoading: isLoadingWidget } = useWidgetCatalogEntry(
    widgetId || ''
  );

  // Mutations
  const createMutation = useCreateWidgetCatalogEntry();
  const updateMutation = useUpdateWidgetCatalogEntry(widgetId || '');

  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(WidgetFormSchema),
    defaultValues: {
      widgetType: WidgetType.COUNTER,
      name: '',
      displayName: '',
      description: '',
      category: '',
      icon: '',
      thumbnail: '',
      defaultWidth: 4,
      defaultHeight: 3,
      visibilityLevel: WidgetVisibilityLevel.ALL,
      isDefault: false,
      isFeatured: false,
      status: WidgetCatalogStatus.ACTIVE,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingWidget) {
      form.reset({
        widgetType: existingWidget.widgetType,
        name: existingWidget.name,
        displayName: existingWidget.displayName,
        description: existingWidget.description,
        category: existingWidget.category,
        icon: existingWidget.icon || '',
        thumbnail: existingWidget.thumbnail || '',
        defaultWidth: existingWidget.defaultSize.width,
        defaultHeight: existingWidget.defaultSize.height,
        visibilityLevel: existingWidget.visibilityLevel,
        isDefault: existingWidget.isDefault,
        isFeatured: existingWidget.isFeatured,
        status: existingWidget.status,
      });
    }
  }, [existingWidget, form]);

  async function onSubmit(values: WidgetFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        widgetType: values.widgetType,
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        category: values.category,
        icon: values.icon || undefined,
        thumbnail: values.thumbnail || undefined,
        defaultSize: {
          width: values.defaultWidth,
          height: values.defaultHeight,
        },
        defaultConfig: {},
        visibilityLevel: values.visibilityLevel,
        isDefault: values.isDefault,
        isFeatured: values.isFeatured,
        status: values.status,
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        router.push('/admin/widgets');
        router.refresh();
      } else if (widgetId && existingWidget) {
        await updateMutation.mutateAsync({
          ...payload,
          version: existingWidget.version,
        });
        router.refresh();
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Form submission error in widget form', 3, {
        errorMessage: errorObj.message,
        mode,
        widgetId,
      })
      form.setError('root', {
        message: errorObj.message || 'Failed to save widget',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === 'edit' && isLoadingWidget) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Widget name, type, and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="widgetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Widget Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(WidgetType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., sales-counter" {...field} />
                  </FormControl>
                  <FormDescription>Lowercase alphanumeric, hyphens, and underscores only</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sales Counter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the widget..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Data, Visualization, Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>Icon, thumbnail, and default size</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>Icon to display in widget picker</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>Preview image for widget</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Width (columns)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Height (rows)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility & Status</CardTitle>
            <CardDescription>Control who can see and use this widget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="visibilityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility Level *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={WidgetVisibilityLevel.ALL}>
                        All Users
                      </SelectItem>
                      <SelectItem value={WidgetVisibilityLevel.AUTHENTICATED}>
                        Authenticated Users
                      </SelectItem>
                      <SelectItem value={WidgetVisibilityLevel.TENANT}>
                        Tenant Users
                      </SelectItem>
                      <SelectItem value={WidgetVisibilityLevel.HIDDEN}>
                        Hidden (Admin Only)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={WidgetCatalogStatus.ACTIVE}>Active</SelectItem>
                      <SelectItem value={WidgetCatalogStatus.INACTIVE}>Inactive</SelectItem>
                      <SelectItem value={WidgetCatalogStatus.DEPRECATED}>Deprecated</SelectItem>
                      <SelectItem value={WidgetCatalogStatus.HIDDEN}>Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Show in Default Widget Palette</FormLabel>
                      <FormDescription>
                        Include this widget for all new dashboards by default
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Feature This Widget</FormLabel>
                      <FormDescription>
                        Highlight in widget picker and recommendations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        {form.formState.errors.root && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800">{form.formState.errors.root.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || (mode === 'edit' && isLoadingWidget)}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Widget' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
