import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisualSchemaBuilder } from "./visual-builder"
import { CodeSchemaEditor } from "./code-editor"
import { Code, Wand2 } from "lucide-react"

interface SchemaBuilderTabsProps {
    value: Record<string, any>
    onChange: (schema: Record<string, any>) => void
}

export function SchemaBuilderTabs({ value, onChange }: SchemaBuilderTabsProps) {
    const [activeTab, setActiveTab] = React.useState<"visual" | "code">("visual")

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "visual" | "code")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Visual Builder
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Code Editor
                </TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="mt-4">
                <VisualSchemaBuilder value={value} onChange={onChange} />
            </TabsContent>

            <TabsContent value="code" className="mt-4">
                <CodeSchemaEditor value={value} onChange={onChange} />
            </TabsContent>
        </Tabs>
    )
}

// Export the main component as default
export default SchemaBuilderTabs
