import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'

interface AllProvidersProps {
  children: ReactNode
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
