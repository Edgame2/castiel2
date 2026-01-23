"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function PublicContentPage() {
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [content, setContent] = useState<string | null>(null)

    // Simulate fetching content
    const fetchContent = async (pwd?: string, viewerEmail?: string) => {
        setLoading(true)
        setError(null)
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 800))

            // Mock logic
            if (pwd === 'password') { // Simple mock check
                setAuthorized(true)
                setContent(`
                    <h1>Secure Document</h1>
                    <p>This is the protected content you requested.</p>
                    <p>It was generated for <strong>Project Alpha</strong>.</p>
                `)
            } else if (pwd) {
                throw new Error("Invalid password")
            } else {
                // Initial load - check if public
                // throw new Error("Password required") 
                // For demo, assume password required
                setAuthorized(false)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Initial check (maybe it's public)
        fetchContent()
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        fetchContent(password, email)
    }

    if (loading && !content) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Protected Content</CardTitle>
                        <CardDescription>
                            Please enter your credentials to view this document.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="Your Email (if required)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Access Content"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white p-8 md:p-16">
            <div className="max-w-4xl mx-auto prose lg:prose-xl">
                <div dangerouslySetInnerHTML={{ __html: content || '' }} />
            </div>
        </div>
    )
}
