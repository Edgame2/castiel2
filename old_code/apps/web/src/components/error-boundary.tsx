'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { trackException } from '@/lib/monitoring/app-insights'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track exception in Application Insights
    trackException(error, 3) // Severity level 3 = Error
    trackTrace('Error caught by boundary', 3, {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500),
      componentStack: errorInfo.componentStack?.substring(0, 500),
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">
                We apologize for the inconvenience. The error has been logged and our team has been
                notified.
              </p>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
              <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
