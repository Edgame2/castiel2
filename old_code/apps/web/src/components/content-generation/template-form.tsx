'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { contentGenerationApi, ContentTemplate } from '@/lib/api/content-generation';
import { Button } from '@/components/ui/button';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    type: z.enum(['document', 'presentation']),
    content: z.string().min(1, 'Content is required'),
});

interface TemplateFormProps {
    initialData?: ContentTemplate;
    mode: 'create' | 'edit';
}

export default function TemplateForm({ initialData, mode }: TemplateFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            type: initialData?.type || 'document',
            content: initialData?.content || '<h1>{{title}}</h1>\n<p>{{content}}</p>',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            if (mode === 'create') {
                await contentGenerationApi.createTemplate(values);
                toast.success('Template created successfully');
            } else if (initialData) {
                await contentGenerationApi.updateTemplate(initialData.id, values);
                toast.success('Template updated successfully');
            }
            router.push('/admin/templates');
            router.refresh();
        } catch (error) {
            toast.error(`Failed to ${mode} template`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Blog Post" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="document">Document</SelectItem>
                                                    <SelectItem value="presentation">Presentation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Describe this template..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <div className="flex justify-end space-x-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? 'Create Template' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Card className="h-full min-h-[500px] flex flex-col">
                            <CardContent className="flex-1 p-0 flex flex-col">
                                <div className="p-4 border-b bg-muted/30">
                                    <FormLabel>Template Content (HTML)</FormLabel>
                                    <FormDescription>
                                        Use HTML for formatting. Use <code>{`{{variable}}`}</code> for dynamic content.
                                        The <code>{`{{content}}`}</code> variable is where the AI output will be placed.
                                    </FormDescription>
                                </div>
                                <div className="flex-1 min-h-[500px]">
                                    <FormField
                                        control={form.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem className="h-full">
                                                <FormControl>
                                                    <Editor
                                                        height="100%"
                                                        defaultLanguage="html"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        theme="vs-dark"
                                                        options={{
                                                            minimap: { enabled: false },
                                                            fontSize: 14,
                                                            wordWrap: 'on',
                                                            padding: { top: 16, bottom: 16 },
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}
