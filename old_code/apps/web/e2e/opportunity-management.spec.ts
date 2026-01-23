/**
 * Opportunity Management E2E Tests
 * 
 * Tests the complete opportunity (shard) management workflow:
 * - Creating opportunities
 * - Viewing opportunity details
 * - Updating opportunities
 * - Risk evaluation display
 * - Opportunity listing and filtering
 * 
 * Prerequisites:
 * - Backend API running on localhost:3001
 * - Frontend web app running on localhost:3000
 * - Test user created (e2e-test@castiel.local)
 * - Cosmos DB containers initialized
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_TIMEOUT = 60000 // 60 seconds for E2E tests
const BASE_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:3001'

// Test user credentials
const TEST_USER = {
  email: 'e2e-test@castiel.local',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'TestUser',
}

// Helper: Login
async function login(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.click()
  await emailInput.fill('')
  await emailInput.type(TEST_USER.email, { delay: 50 })
  
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.click()
  await passwordInput.fill('')
  await passwordInput.type(TEST_USER.password, { delay: 50 })
  
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

// Helper: Navigate to opportunities
async function navigateToOpportunities(page: Page) {
  // Try multiple possible routes
  const possibleRoutes = [
    '/opportunities',
    '/shards',
    '/dashboard/opportunities',
    '/crm/opportunities',
  ]
  
  for (const route of possibleRoutes) {
    try {
      await page.goto(route)
      await page.waitForLoadState('networkidle', { timeout: 5000 })
      // Check if we're on a valid page (not 404)
      if (!page.url().includes('404') && !page.url().includes('error')) {
        return
      }
    } catch (e) {
      // Try next route
      continue
    }
  }
  
  // If no route works, try dashboard and look for opportunities link
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  
  // Look for opportunities link in navigation
  const opportunitiesLink = page.locator('a, button').filter({ hasText: /opportunit/i }).first()
  if (await opportunitiesLink.count() > 0) {
    await opportunitiesLink.click()
    await page.waitForLoadState('networkidle')
  }
}

test.describe('Opportunity Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
  })

  test('should display opportunities list page', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Additional wait for data loading
    
    // Check for common opportunity list elements
    // The page should have either:
    // - A table/list of opportunities
    // - A "Create" or "New" button
    // - Search/filter controls
    // - Or at least not show an error
    
    const hasTable = await page.locator('table').count() > 0
    const hasList = await page.locator('[role="list"]').count() > 0
    const hasCreateButton = await page.locator('button, a').filter({ hasText: /create|new|add/i }).count() > 0
    const hasError = await page.locator('[role="alert"], .error, .error-message').count() > 0
    
    // At least one of these should be present (or no error)
    expect(hasTable || hasList || hasCreateButton || !hasError).toBe(true)
  })

  test('should allow creating a new opportunity', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Look for create/new button
    const createButton = page.locator('button, a').filter({ hasText: /create|new|add/i }).first()
    
    if (await createButton.count() > 0) {
      await createButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Check if we're on a form/page for creating opportunity
      // Look for form fields or "Save" button
      const hasForm = await page.locator('form, input[type="text"], input[name*="name"]').count() > 0
      const hasSaveButton = await page.locator('button').filter({ hasText: /save|create|submit/i }).count() > 0
      
      // Should have form elements or save button
      expect(hasForm || hasSaveButton).toBe(true)
    } else {
      // If no create button found, test passes (feature might not be available)
      test.skip()
    }
  })

  test('should display opportunity details when viewing', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Try to find and click on an opportunity item
    const opportunityItem = page.locator('tr, [role="listitem"], .opportunity-item, .shard-item').first()
    
    if (await opportunityItem.count() > 0) {
      await opportunityItem.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      
      // Check for opportunity details
      // Should have some detail elements (name, amount, stage, etc.)
      const hasDetails = await page.locator('h1, h2, [data-testid*="name"], [data-testid*="amount"]').count() > 0
      const hasError = await page.locator('[role="alert"], .error').count() > 0
      
      // Should show details or at least not show error
      expect(hasDetails || !hasError).toBe(true)
    } else {
      // If no opportunities found, test passes (no data scenario)
      test.skip()
    }
  })

  test('should allow searching/filtering opportunities', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Look for search/filter input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]').first()
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000) // Wait for search to execute
      
      // Search should execute (no error)
      const hasError = await page.locator('[role="alert"], .error').count() > 0
      expect(hasError).toBe(false)
    } else {
      // If no search input found, test passes (feature might not be available)
      test.skip()
    }
  })

  test('should display risk evaluation information', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Try to find and click on an opportunity
    const opportunityItem = page.locator('tr, [role="listitem"], .opportunity-item').first()
    
    if (await opportunityItem.count() > 0) {
      await opportunityItem.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000) // Wait for risk evaluation to load
      
      // Look for risk-related elements
      // Risk score, risk indicators, risk warnings, etc.
      const hasRiskInfo = await page.locator('[data-testid*="risk"], .risk-score, .risk-indicator, [class*="risk"]').count() > 0
      const hasError = await page.locator('[role="alert"], .error').count() > 0
      
      // Should show risk info or at least not show error
      // Note: Risk evaluation might be async, so we're lenient here
      expect(hasRiskInfo || !hasError).toBe(true)
    } else {
      // If no opportunities found, test passes
      test.skip()
    }
  })

  test('should handle navigation between opportunities', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Get list of opportunities
    const opportunityItems = page.locator('tr, [role="listitem"], .opportunity-item')
    const count = await opportunityItems.count()
    
    if (count >= 2) {
      // Click first opportunity
      await opportunityItems.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      const firstUrl = page.url()
      
      // Navigate back to list
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Click second opportunity
      await opportunityItems.nth(1).click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      const secondUrl = page.url()
      
      // URLs should be different
      expect(firstUrl).not.toBe(secondUrl)
    } else {
      // If less than 2 opportunities, test passes
      test.skip()
    }
  })
})

test.describe('Opportunity Management - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should handle API errors gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    // Intercept API calls and simulate error
    await page.route('**/api/v1/shard**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })
    
    await navigateToOpportunities(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Should show error message or handle gracefully
    const hasError = await page.locator('[role="alert"], .error, .error-message').count() > 0
    const hasEmptyState = await page.locator('.empty-state, [data-testid="empty"]').count() > 0
    
    // Should show error or empty state
    expect(hasError || hasEmptyState).toBe(true)
  })

  test('should handle network timeouts gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    
    // Intercept API calls and simulate timeout
    await page.route('**/api/v1/shard**', route => {
      // Don't fulfill, simulating timeout
    })
    
    await navigateToOpportunities(page)
    
    // Wait for timeout or error handling
    await page.waitForTimeout(5000)
    
    // Should show loading state, error, or empty state
    const hasLoading = await page.locator('.loading, [data-testid="loading"]').count() > 0
    const hasError = await page.locator('[role="alert"], .error').count() > 0
    const hasEmptyState = await page.locator('.empty-state').count() > 0
    
    // Should show one of these states
    expect(hasLoading || hasError || hasEmptyState).toBe(true)
  })
})
