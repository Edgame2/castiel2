'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { contentGenerationApi, ContentTemplate } from '@/lib/api/content-generation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Download, FileText, Presentation, FileType } from 'lucide-react';
import { toast } from 'sonner';

export default function ContentGenerationPage() {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
    const [prompt, setPrompt] = useState('');
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: templatesData } = useQuery({
        queryKey: ['templates'],
        queryFn: contentGenerationApi.listTemplates,
    });

    const selectedTemplate = templatesData?.templates.find(t => t.id === selectedTemplateId);

    // Extract variables when template changes
    useEffect(() => {
        if (selectedTemplate) {
            const vars: Record<string, string> = {};
            selectedTemplate.variables.forEach(v => {
                if (v !== 'content') {
                    vars[v] = '';
                }
            });
            setVariables(vars);
        } else {
            setVariables({});
        }
    }, [selectedTemplate]);

    const handleGenerate = async () => {
        if (!prompt) {
            toast.error('Please enter a prompt');
            return;
        }

        setIsGenerating(true);
        try {
            const result = await contentGenerationApi.generate({
                prompt,
                templateId: selectedTemplateId === 'none' ? undefined : selectedTemplateId,
                variables: selectedTemplateId === 'none' ? undefined : variables,
                format: 'html',
            });

            if ('content' in result) {
                setGeneratedContent(result.content);
                toast.success('Content generated successfully');
            }
        } catch (error) {
            toast.error('Failed to generate content');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'docx' | 'pptx') => {
        if (!generatedContent) return;

        try {
            toast.loading(`Exporting as ${format.toUpperCase()}...`);
            const blob = await contentGenerationApi.generate({
                prompt, // We need to send prompt again to regenerate or we should have stored the state on server
                // Ideally, we should have a "convert" endpoint that takes HTML, but for now we re-generate
                // or we assume the server caches or we send the same request with different format.
                // Re-generating might produce different results if temperature > 0.
                // BUT, our service generates content THEN converts.
                // If we want exact same content, we should pass the generated content to a conversion endpoint.
                // However, the current API design is "generate(format)".
                // Let's use the same inputs. It might slightly vary if AI is non-deterministic.
                // To fix this properly, we'd need a "convert" endpoint.
                // For MVP, we'll re-request.
                templateId: selectedTemplateId === 'none' ? undefined : selectedTemplateId,
                variables: selectedTemplateId === 'none' ? undefined : variables,
                format,
            });

            if (blob instanceof Blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a' as any);
                a.href = url;
                a.download = `generated-content.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.dismiss();
                toast.success('Export successful');
            }
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to export');
        }
    };

    return (
        <div className="container mx-auto py-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Content Generation</h1>
                <p className="text-muted-foreground">
                    Generate content using AI templates and export to various formats.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Panel: Inputs */}
                <Card className="flex flex-col overflow-hidden">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-6">
                        <div className="space-y-2">
                            <Label>Template</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Template (Raw Output)</SelectItem>
                                    {templatesData?.templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name} ({t.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Prompt</Label>
                            <Textarea
                                placeholder="Describe what you want to generate..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="min-h-[150px]"
                            />
                        </div>

                        {selectedTemplate && Object.keys(variables).length > 0 && (
                            <div className="space-y-4 border-t pt-4">
                                <Label className="text-base">Template Variables</Label>
                                {Object.keys(variables).map((key) => (
                                    <div key={key} className="space-y-2">
                                        <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                                        <Input
                                            value={variables[key]}
                                            onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                                            placeholder={`Enter value for ${key}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                'Generate Content'
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Panel: Preview */}
                <Card className="flex flex-col overflow-hidden bg-muted/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Preview</CardTitle>
                        {generatedContent && (
                            <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf' as any)}>
                                    <FileType className="mr-2 h-4 w-4" /> PDF
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('docx' as any)}>
                                    <FileText className="mr-2 h-4 w-4" /> Word
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('pptx' as any)}>
                                    <Presentation className="mr-2 h-4 w-4" /> PowerPoint
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 relative">
                        {generatedContent ? (
                            <div className="h-full overflow-y-auto p-6 bg-white shadow-inner mx-4 mb-4 rounded-md prose max-w-none dark:bg-zinc-900 dark:prose-invert">
                                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Loader2 className="h-8 w-8 animate-pulse" />
                                </div>
                                <p>Generated content will appear here.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
