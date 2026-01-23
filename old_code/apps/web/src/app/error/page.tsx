import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ErrorContent({ searchParams }: { searchParams: { type?: string; message?: string } }) {
  const errorType = searchParams.type || 'unknown'
  const errorMessage = searchParams.message || 'An error occurred'

  const errorMessages: Record<string, string> = {
    auth: 'Authentication failed. Please try logging in again.',
    no_code: 'No authorization code received.',
    token_exchange_failed: 'Failed to exchange authorization code for tokens.',
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
          <p className="text-muted-foreground">
            {errorMessages[errorMessage] || errorMessages[errorType] || errorMessage}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage({ searchParams }: { searchParams: { type?: string; message?: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent searchParams={searchParams} />
    </Suspense>
  )
}
