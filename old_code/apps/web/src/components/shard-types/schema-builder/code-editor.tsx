import * as React from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface CodeSchemaEditorProps {
    value: Record<string, any>
    onChange: (schema: Record<string, any>) => void
}

export function CodeSchemaEditor({ value, onChange }: CodeSchemaEditorProps) {
    const { theme } = useTheme()
    const [code, setCode] = React.useState(() => JSON.stringify(value, null, 2))
    const [error, setError] = React.useState<string | null>(null)

    // Update local code when external value changes
    React.useEffect(() => {
        try {
            const formatted = JSON.stringify(value, null, 2)
            if (formatted !== code) {
                setCode(formatted)
            }
        } catch (e) {
            // Ignore formatting errors
        }
    }, [value])

    const handleEditorChange = (newValue: string | undefined) => {
        if (!newValue) return

        setCode(newValue)
        setError(null)

        try {
            const parsed = JSON.parse(newValue)

            // Validate it's a valid JSON Schema
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
                setError("Schema must be a JSON object")
                return
            }

            onChange(parsed)
        } catch (e) {
            setError("Invalid JSON syntax")
        }
    }

    return (
        <div className="space-y-2">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
                <Editor
                    height="400px"
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

            <p className="text-xs text-muted-foreground">
                Edit the JSON Schema directly. Changes will be validated in real-time.
            </p>
        </div>
    )
}

function EditorSkeleton() {
    return (
        <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    )
}
