"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Wand2, Upload, FileText, MonitorPlay } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { trackTrace } from "@/lib/monitoring/app-insights"

interface TemplateEditorProps {
    template?: any
    onSave: (template: any) => void
    onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
    const [name, setName] = useState(template?.name || "")
    const [description, setDescription] = useState(template?.description || "")
    const [type, setType] = useState<'document' | 'presentation'>(template?.type || 'document')

    // Document Mode State
    const [blocks, setBlocks] = useState<any[]>(
        template?.content ? parseContentToBlocks(template.content) : []
    )

    // Presentation Mode State
    const [slides, setSlides] = useState<any[]>(template?.slides || [])
    const [activeSlideIndex, setActiveSlideIndex] = useState(0)

    // Variable Config
    const [variableConfig, setVariableConfig] = useState<Record<string, any>>(template?.variableConfig || {})

    // Import State
    const [isImporting, setIsImporting] = useState(false)

    // Helper functions
    function parseContentToBlocks(html: string) {
        // Simplified parser placeholder
        return [{ type: 'text', content: html }]
    }

    const handleAddBlock = (type: 'text' | 'insight') => {
        setBlocks([...blocks, { type, content: '', id: Date.now() }])
    }

    const handleUpdateBlock = (index: number, content: string) => {
        const newBlocks = [...blocks]
        newBlocks[index].content = content
        setBlocks(newBlocks)
    }

    const handleRemoveBlock = (index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index))
    }

    const handleAddSlide = () => {
        setSlides([...slides, {
            title: "New Slide",
            layout: "title-bullets",
            content: { bullets: ["Point 1"] }
        }])
        setActiveSlideIndex(slides.length)
    }

    const handleUpdateSlide = (index: number, field: string, value: any) => {
        const newSlides = [...slides]
        newSlides[index] = { ...newSlides[index], [field]: value }
        setSlides(newSlides)
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        // Mock import API call
        trackTrace("Importing file", 1, {
          fileName: file.name,
        })

        // Simulate delay and result
        setTimeout(() => {
            if (file.name.endsWith('.pptx')) {
                setType('presentation')
                setSlides([
                    { title: "Imported Slide 1", layout: "title-bullets", content: { bullets: ["Imported content"] } },
                    { title: "Imported Slide 2", layout: "image-text", content: { text: "More content" } }
                ])
            } else {
                setType('document')
                setBlocks([{ type: 'text', content: `Imported content from ${file.name}` }])
            }
            setName(file.name.split('.' as any)[0])
            setIsImporting(false)
        }, 1000)
    }

    const handleSave = () => {
        let content = ''
        if (type === 'document') {
            content = blocks.map(b => {
                if (b.type === 'insight') return `{{${b.variableName}}}`
                return b.content
            }).join('\n')
        } else {
            content = JSON.stringify(slides)
        }

        onSave({
            ...template,
            name,
            description,
            type,
            content,
            slides: type === 'presentation' ? slides : undefined,
            variableConfig
        })
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Template Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Quarterly Report" />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={type === 'document' ? 'default' : 'outline'}
                                    onClick={() => setType('document')}
                                    className="flex-1"
                                >
                                    <FileText className="mr-2 h-4 w-4" /> Document
                                </Button>
                                <Button
                                    variant={type === 'presentation' ? 'default' : 'outline'}
                                    onClick={() => setType('presentation')}
                                    className="flex-1"
                                >
                                    <MonitorPlay className="mr-2 h-4 w-4" /> Slides
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this template..." />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleImport}
                            accept=".pdf,.docx,.pptx"
                        />
                        <Button variant="outline" className="w-full" disabled={isImporting}>
                            <Upload className="mr-2 h-4 w-4" />
                            {isImporting ? "Importing..." : "Import File"}
                        </Button>
                    </div>
                    <Button onClick={handleSave}>Save Template</Button>
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            </div>

            <div className="flex-1 border rounded-md p-4 overflow-hidden flex flex-col">
                {type === 'document' ? (
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {blocks.map((block, index) => (
                            <Card key={index}>
                                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-medium">
                                        {block.type === 'insight' ? (
                                            <span className="flex items-center text-purple-600">
                                                <Wand2 className="mr-2 h-4 w-4" /> AI Insight Block
                                            </span>
                                        ) : "Text Block"}
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveBlock(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {block.type === 'insight' ? (
                                        <div className="space-y-2">
                                            <Label>Variable Name</Label>
                                            <Input
                                                value={block.variableName || ''}
                                                onChange={e => {
                                                    const newBlocks = [...blocks]
                                                    newBlocks[index].variableName = e.target.value
                                                    setBlocks(newBlocks)
                                                }}
                                                placeholder="e.g., executive_summary"
                                            />
                                            <Label>Insight Prompt / Label</Label>
                                            <Input
                                                value={block.prompt || ''}
                                                onChange={e => {
                                                    const newBlocks = [...blocks]
                                                    newBlocks[index].prompt = e.target.value
                                                    setBlocks(newBlocks)
                                                }}
                                                placeholder="What should AI generate here?"
                                            />
                                        </div>
                                    ) : (
                                        <Textarea
                                            value={block.content}
                                            onChange={e => handleUpdateBlock(index, e.target.value)}
                                            className="min-h-[100px]"
                                            placeholder="Enter text content..."
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        <div className="flex gap-2 justify-center p-4 border-t border-dashed">
                            <Button variant="outline" size="sm" onClick={() => handleAddBlock('text')}>
                                <Plus className="mr-2 h-4 w-4" /> Add Text
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAddBlock('insight')}>
                                <Wand2 className="mr-2 h-4 w-4" /> Add AI Insight
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full gap-4">
                        {/* Slides List */}
                        <div className="w-48 border-r pr-4 overflow-y-auto space-y-2">
                            {slides.map((slide, index) => (
                                <div
                                    key={index}
                                    className={`p-2 border rounded cursor-pointer hover:bg-accent ${index === activeSlideIndex ? 'ring-2 ring-primary' : ''}`}
                                    onClick={() => setActiveSlideIndex(index)}
                                >
                                    <div className="text-xs font-medium truncate">{slide.title}</div>
                                    <div className="text-[10px] text-muted-foreground">{slide.layout}</div>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full" onClick={handleAddSlide}>
                                <Plus className="mr-2 h-4 w-4" /> Add Slide
                            </Button>
                        </div>

                        {/* Slide Editor */}
                        <div className="flex-1 overflow-y-auto">
                            {slides[activeSlideIndex] && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Slide Title</Label>
                                            <Input
                                                value={slides[activeSlideIndex].title}
                                                onChange={e => handleUpdateSlide(activeSlideIndex, 'title', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Layout</Label>
                                            <select
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={slides[activeSlideIndex].layout}
                                                onChange={e => handleUpdateSlide(activeSlideIndex, 'layout', e.target.value)}
                                            >
                                                <option value="title-bullets">Title & Bullets</option>
                                                <option value="two-column">Two Columns</option>
                                                <option value="image-text">Image & Text</option>
                                                <option value="title-only">Title Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Content (JSON Structure)</Label>
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Edit the raw content structure. Use <code>{"{{variable}}"}</code> for dynamic content.
                                        </div>
                                        <Textarea
                                            value={JSON.stringify(slides[activeSlideIndex].content, null, 2)}
                                            onChange={e => {
                                                try {
                                                    const content = JSON.parse(e.target.value)
                                                    handleUpdateSlide(activeSlideIndex, 'content', content)
                                                } catch (err) {
                                                    // Ignore parse errors while typing
                                                }
                                            }}
                                            className="font-mono text-sm h-[200px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Speaker Notes</Label>
                                        <Textarea
                                            value={slides[activeSlideIndex].notes || ''}
                                            onChange={e => handleUpdateSlide(activeSlideIndex, 'notes', e.target.value)}
                                            placeholder="Notes for the presenter..."
                                        />
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h3 className="text-sm font-medium mb-2">Preview</h3>
                                        <div className="aspect-video bg-muted rounded-lg border p-8 flex flex-col shadow-sm">
                                            <h2 className="text-2xl font-bold mb-4">{slides[activeSlideIndex].title}</h2>
                                            <div className="flex-1">
                                                {/* Simple preview logic */}
                                                {slides[activeSlideIndex].content.bullets && (
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {slides[activeSlideIndex].content.bullets.map((b: string, i: number) => (
                                                            <li key={i}>{b}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {slides[activeSlideIndex].content.text && (
                                                    <p>{slides[activeSlideIndex].content.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
