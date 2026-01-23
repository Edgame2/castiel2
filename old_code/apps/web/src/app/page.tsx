'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking auth
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
