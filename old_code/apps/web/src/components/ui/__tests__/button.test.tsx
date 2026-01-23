import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me' as any)).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('handles click events', async () => {
    let clicked = false
    const handleClick = () => {
      clicked = true
    }
    
    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByText('Click me' as any)
    button.click()
    
    expect(clicked).toBe(true)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled' as any)
    expect(button).toBeDisabled()
  })
})
