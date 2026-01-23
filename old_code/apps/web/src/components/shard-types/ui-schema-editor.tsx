import * as React from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Info } from "lucide-react"

interface UISchemaEditorProps {
    value?: Record<string, any>
    onChange: (uiSchema: Record<string, any>) => void
}

export function UISchemaEditor({ value, onChange }: UISchemaEditorProps) {
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = React.useState(false)
    const [code, setCode] = React.useState(() =>
        JSON.stringify(value || {}, null, 2)
    )

    React.useEffect(() => {
        if (value) {
            setCode(JSON.stringify(value, null, 2))
        }
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleEditorChange = (newValue: string | undefined) => {
        if (!newValue) return

        setCode(newValue)

        try {
            const parsed = JSON.parse(newValue)
            onChange(parsed)
        } catch (e) {
            // Invalid JSON, don't update
        }
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label>UI Schema (Optional)</Label>
                        <p className="text-sm text-muted-foreground">
                            Customize how form fields are rendered
                        </p>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isOpen ? (
                                <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Hide
                                </>
                            ) : (
                                <>
                                    <ChevronRight className="h-4 w-4 mr-2" />
                                    Show
                                </>
                            )}
                        </Button>
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-2">
                    <div className="rounded-md bg-muted p-3 text-sm">
                        <div className="flex gap-2">
                            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="space-y-1">
                                <p className="font-medium">UI Schema Examples:</p>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                    <li>
                                        <code className="text-xs">ui:widget</code> - Choose widget type
                                        (text, textarea, select, etc.)
                                    </li>
                                    <li>
                                        <code className="text-xs">ui:placeholder</code> - Set placeholder
                                        text
                                    </li>
                                    <li>
                                        <code className="text-xs">ui:help</code> - Add help text
                                    </li>
                                    <li>
                                        <code className="text-xs">ui:order</code> - Control field order
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <Editor
                            height="300px"
                            defaultLanguage="json"
                            value={code}
                            onChange={handleEditorChange}
                            theme={theme === "dark" ? "vs-dark" : "light"}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: "on",
                                formatOnPaste: true,
                                formatOnType: true,
                            }}
                            loading={<EditorSkeleton />}
                        />
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

function EditorSkeleton() {
    return (
        <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    )
}
