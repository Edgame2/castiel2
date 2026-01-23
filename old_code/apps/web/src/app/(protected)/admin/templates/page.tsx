'use client';

import { useQuery } from '@tanstack/react-query';
import { contentGenerationApi } from '@/lib/api/content-generation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Presentation, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

export default function TemplatesPage() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['templates'],
        queryFn: contentGenerationApi.listTemplates,
    });

    const handleDelete = async (id: string) => {
        try {
            await contentGenerationApi.deleteTemplate(id);
            toast.success('Template deleted successfully');
            refetch();
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Templates</h1>
                    <p className="text-muted-foreground">
                        Manage templates for content generation.
                    </p>
                </div>
                <Link href="/admin/templates/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/50" />
                            <CardContent className="h-20 bg-muted/20" />
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.templates.map((template) => (
                        <Card key={template.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-base font-medium">
                                        {template.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {template.type === 'document' ? (
                                            <span className="flex items-center text-xs">
                                                <FileText className="mr-1 h-3 w-3" /> Document
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs">
                                                <Presentation className="mr-1 h-3 w-3" /> Presentation
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                    {template.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                                    <span>Updated {format(new Date(template.updatedAt), 'MMM d, yyyy')}</span>
                                    <div className="flex space-x-2">
                                        <Link href={`/admin/templates/${template.id}`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </Link>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the template.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {data?.templates.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-20" />
                            <p>No templates found.</p>
                            <Link href="/admin/templates/create" className="mt-4">
                                <Button variant="outline">Create your first template</Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
