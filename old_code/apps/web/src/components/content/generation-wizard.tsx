"use client"

import { useState } from "react"
import { Check, ChevronRight, FileText, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TemplateCatalogue } from "./template-catalogue"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface GenerationWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectName: string;
}

export function GenerationWizard({ open, onOpenChange, projectId, projectName }: GenerationWizardProps) {
    const [step, setStep] = useState(1)
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [variables, setVariables] = useState<Record<string, string>>({})
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedContent, setGeneratedContent] = useState<string | null>(null)
    const [shareConfig, setShareConfig] = useState({
        password: "",
        restricted: false,
        allowedEmails: ""
    })
    const [shareLink, setShareLink] = useState<string | null>(null)

    const handleTemplateSelect = (template: any) => {
        setSelectedTemplate(template)
        // Initialize variables
        const initialVars: Record<string, string> = {}
        // Extract manual variables (not insight ones)
        if (template.variableConfig) {
            Object.entries(template.variableConfig).forEach(([key, config]: [string, any]) => {
                if (config.type === 'text') {
                    initialVars[key] = ''
                }
            })
        }
        setVariables(initialVars)
        setStep(2)
    }

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Mock response
            setGeneratedContent(`
                <h1>${selectedTemplate.name} for ${projectName}</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                <hr/>
                ${selectedTemplate.content}
            `)
            setStep(3)
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Generation failed", 3, {
              errorMessage: errorObj.message,
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleShare = async () => {
        setIsGenerating(true)
        try {
            // Simulate API call to create share link
            await new Promise(resolve => setTimeout(resolve, 1000))
            setShareLink(`https://app.castiel.ai/public/content/${Date.now()}`)
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Sharing failed", 3, {
              errorMessage: errorObj.message,
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const reset = () => {
        setStep(1)
        setSelectedTemplate(null)
        setVariables({})
        setGeneratedContent(null)
        setShareLink(null)
        setShareConfig({ password: "", restricted: false, allowedEmails: "" })
    }

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(reset, 300)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Generate Document</DialogTitle>
                    <DialogDescription>
                        Create a new document for {projectName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Steps Indicator */}
                    <div className="flex items-center justify-center space-x-4 py-4 border-b bg-muted/30">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step >= 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>1</div>
                            <span className="text-sm font-medium">Select Template</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step >= 2 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>2</div>
                            <span className="text-sm font-medium">Configure</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step >= 3 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>3</div>
                            <span className="text-sm font-medium">Preview & Share</span>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        {step === 1 && (
                            <TemplateCatalogue
                                onSelect={handleTemplateSelect}
                            />
                        )}

                        {step === 2 && selectedTemplate && (
                            <div className="max-w-xl mx-auto space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Configuration</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Review and fill in the details below. AI sections will be generated automatically.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {Object.entries(selectedTemplate.variableConfig || {}).map(([key, config]: [string, any]) => (
                                        <div key={key} className="space-y-2">
                                            <Label>{config.label || key}</Label>
                                            {config.type === 'insight' ? (
                                                <div className="p-3 bg-purple-50 border border-purple-100 rounded-md text-sm text-purple-700 flex items-center gap-2">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Will be generated by AI
                                                </div>
                                            ) : (
                                                <Input
                                                    value={variables[key] || ''}
                                                    onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                                                    placeholder={`Enter ${config.label || key}`}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* If no variables, show message */}
                                    {Object.keys(selectedTemplate.variableConfig || {}).length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No manual configuration needed for this template.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && generatedContent && (
                            <div className="grid grid-cols-3 gap-6 h-full">
                                <div className="col-span-2 bg-white border shadow-sm rounded-lg p-8 overflow-auto prose prose-sm max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                        <h3 className="font-medium">Share Securely</h3>
                                        <div className="space-y-2">
                                            <Label>Password Protection (Optional)</Label>
                                            <Input
                                                type="password"
                                                placeholder="Set a password"
                                                value={shareConfig.password}
                                                onChange={(e) => setShareConfig({ ...shareConfig, password: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Restrict to Emails (Optional)</Label>
                                            <Input
                                                placeholder="comma, separated, emails"
                                                value={shareConfig.allowedEmails}
                                                onChange={(e) => setShareConfig({ ...shareConfig, allowedEmails: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground">Leave empty for public link (if no password)</p>
                                        </div>

                                        {shareLink ? (
                                            <div className="p-3 bg-green-50 border border-green-100 rounded-md space-y-2">
                                                <p className="text-sm text-green-800 font-medium">Link Created!</p>
                                                <div className="flex items-center gap-2">
                                                    <Input readOnly value={shareLink} className="bg-white h-8 text-xs" />
                                                    <Button size="sm" variant="outline" className="h-8" onClick={() => navigator.clipboard.writeText(shareLink)}>
                                                        Copy
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button className="w-full" onClick={handleShare} disabled={isGenerating}>
                                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Share Link"}
                                            </Button>
                                        )}
                                    </div>

                                    <Button variant="outline" className="w-full">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download PDF
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10">
                    {step === 1 && (
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    )}
                    {step === 2 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={isGenerating}>Back</Button>
                            <Button onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Generate Document
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button onClick={handleClose}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
