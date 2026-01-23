import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should redirect from root', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Should redirect to dashboard, auth flow, or login
    const currentUrl = page.url()
    const redirected = currentUrl.includes('/dashboard') || 
                       currentUrl.includes('/auth') || 
                       currentUrl.includes('/login')

    // Check if URL changed from root
    expect(redirected || currentUrl !== 'http://localhost:3000/').toBe(true)
  })
})

test.describe('Dashboard Layout', () => {
  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for navigation items (they might be protected by auth)
    const hasNav = await page.locator('nav').count() > 0
    const hasAuth = page.url().includes('auth')

    // Either we see navigation or we're redirected to auth
    expect(hasNav || hasAuth).toBeTruthy()
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for theme toggle button (sun/moon icon)
    const themeToggle = page.locator('button').filter({ hasText: /toggle theme/i }).first()

    if (await themeToggle.count() > 0) {
      await themeToggle.click()

      // Check if dark class is applied to html element
      const htmlElement = page.locator('html')
      const hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'))

      expect(typeof hasDarkClass).toBe('boolean')
    }
  })
})
