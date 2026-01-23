
import { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileUp, AlertCircle, CheckCircle, X } from 'lucide-react'
import userApi from '@/lib/api/users'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

interface ImportUsersDialogProps {
    onUserImported: () => void
}

export function ImportUsersDialog({ onUserImported }: ImportUsersDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ message: string; added: number; failed: number; errors: any[] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
        }
    }

    const handleImport = async () => {
        if (!file) return
        setLoading(true)
        setResult(null)
        try {
            const res = await userApi.importUsers(file)
            setResult(res)
            if (res.added > 0) {
                onUserImported()
                toast.success(`Allocated ${res.added} users successfully`)
            }
            if (res.failed > 0) {
                toast.warning(`Failed to import ${res.failed} users`)
            } else if (res.added > 0) {
                setTimeout(() => setOpen(false), 2000)
            }
        } catch (error) {
            toast.error('Failed to import users. Please check the file format.')
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace('Failed to import users', 3, {
                errorMessage: errorObj.message,
                fileName: file.name,
            })
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Users</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk create users. The file should have headers: email, firstName, lastName, roles.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-center w-full">
                        <label
                            htmlFor="dropzone-file"
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600",
                                file ? "border-primary bg-primary/5" : "border-gray-300"
                            )}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileUp className={cn("w-8 h-8 mb-3", file ? "text-primary" : "text-gray-400")} />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">{file ? file.name : "Click to upload"}</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">CSV file (MAX. 5MB)</p>
                            </div>
                            <input
                                id="dropzone-file"
                                type="file"
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                            />
                        </label>
                        {file && (
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); reset(); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {result && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertTitle>Success</AlertTitle>
                                    <AlertDescription>{result.added} users added</AlertDescription>
                                </Alert>
                                {result.failed > 0 && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Failed</AlertTitle>
                                        <AlertDescription>{result.failed} users failed</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {result.errors.length > 0 && (
                                <div className="border rounded-md p-2">
                                    <p className="text-sm font-medium mb-2 px-2">Error Details:</p>
                                    <ScrollArea className="h-[150px]">
                                        <div className="space-y-1 px-2">
                                            {result.errors.map((err, i) => (
                                                <div key={i} className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-1 rounded">
                                                    Row {err.row}: {err.email} - {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!file || loading}>
                        {loading ? 'Importing...' : 'Import Users'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
