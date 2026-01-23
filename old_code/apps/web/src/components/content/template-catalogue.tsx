"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Copy, Edit, FileText, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContentTemplate } from "@/lib/api/content-generation"
// Note: In a real app, we'd import from a shared package or API client. 
// For now, I'll define a local interface if needed, but ideally we use the one from API types if available in frontend.

// Mocking the type here if not available, or I should check if I can import it.
// Let's assume I need to fetch from API.

interface TemplateCatalogueProps {
    onSelect?: (template: any) => void;
    onEdit?: (template: any) => void;
    onClone?: (template: any) => void;
    onCreate?: () => void;
    isAdmin?: boolean;
}

export function TemplateCatalogue({ onSelect, onEdit, onClone, onCreate, isAdmin }: TemplateCatalogueProps) {
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState<string | null>(null)

    // Mock data fetch
    useEffect(() => {
        // TODO: Replace with actual API call
        const fetchTemplates = async () => {
            setLoading(true)
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500))

            // Mock data
            setTemplates([
                {
                    id: "1",
                    name: "Executive Summary",
                    description: "High-level summary for stakeholders",
                    type: "document",
                    category: "General",
                    tags: ["summary", "executive"],
                    isSystem: true,
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "2",
                    name: "Q3 Sales Deck",
                    description: "Standard sales presentation template",
                    type: "presentation",
                    category: "Sales",
                    tags: ["sales", "quarterly"],
                    isSystem: true,
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "3",
                    name: "Custom Project Report",
                    description: "My custom report format",
                    type: "document",
                    category: "Project",
                    tags: ["report"],
                    isSystem: false,
                    updatedAt: new Date().toISOString(),
                }
            ])
            setLoading(false)
        }

        fetchTemplates()
    }, [])

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category ? t.category === category : true
        return matchesSearch && matchesCategory
    })

    const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={category === null ? "secondary" : "ghost"}
                            onClick={() => setCategory(null)}
                            size="sm"
                        >
                            All
                        </Button>
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={category === cat ? "secondary" : "ghost"}
                                onClick={() => setCategory(cat)}
                                size="sm"
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>
                {isAdmin && (
                    <Button onClick={onCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-lg border bg-muted animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <Card key={template.id} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        {template.type === 'presentation' ? (
                                            <Presentation className="h-6 w-6 text-primary" />
                                        ) : (
                                            <FileText className="h-6 w-6 text-primary" />
                                        )}
                                    </div>
                                    {template.isSystem && (
                                        <Badge variant="secondary">System</Badge>
                                    )}
                                </div>
                                <CardTitle className="mt-4">{template.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {template.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex flex-wrap gap-2">
                                    {template.tags?.map((tag: string) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <Button variant="outline" size="sm" onClick={() => onSelect?.(template)}>
                                    Preview
                                </Button>
                                <div className="flex gap-2">
                                    {onClone && (
                                        <Button variant="ghost" size="icon" onClick={() => onClone(template)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {isAdmin && onEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(template)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
