/**
 * Lazy Load Wrapper Component
 * Provides intersection observer-based lazy loading for heavy components
 */

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyLoadWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  threshold?: number
  minHeight?: string | number
  onLoad?: () => void
}

/**
 * Wrapper component that lazy loads children when they enter viewport
 */
export function LazyLoadWrapper({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  minHeight = '200px',
  onLoad,
}: LazyLoadWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const currentRef = ref.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          onLoad?.()
          observer.disconnect()
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    observer.observe(currentRef)

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [rootMargin, threshold, onLoad])

  return (
    <div
      ref={ref}
      style={{
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
      }}
    >
      {isVisible ? children : fallback || <Skeleton className="h-full w-full" />}
    </div>
  )
}

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoad(options?: {
  rootMargin?: string
  threshold?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const currentRef = ref.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: options?.rootMargin || '50px',
        threshold: options?.threshold || 0.1,
      }
    )

    observer.observe(currentRef)

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [options?.rootMargin, options?.threshold])

  return { ref, isVisible }
}

/**
 * HOC for lazy loading components
 */
export function withLazyLoad<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode
    rootMargin?: string
    threshold?: number
    minHeight?: string | number
  }
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoadWrapper
        fallback={options?.fallback}
        rootMargin={options?.rootMargin}
        threshold={options?.threshold}
        minHeight={options?.minHeight}
      >
        <Component {...props} />
      </LazyLoadWrapper>
    )
  }
}
