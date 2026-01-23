/**
 * Web Search E2E Tests
 * 
 * Tests the complete web search workflow from UI interaction through backend processing
 * to result display. Includes basic search, deep search, provider fallback, and error handling.
 * 
 * Prerequisites:
 * - Backend API running on localhost:3001
 * - Frontend web app running on localhost:3000
 * - Test user created (e2e-test@castiel.local)
 * - SerpAPI and Bing API keys configured
 * - Cosmos DB containers initialized (c_search, c_webpages)
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

    await page.locator('input[type="email"]').fill(TEST_USER.email)
    await page.locator('input[type="password"]').fill(TEST_USER.password)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

// Helper: Navigate to Web Search
async function navigateToWebSearch(page: Page) {
    await page.goto('/ai-insights/web-search')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('Web Search')
}

// Helper: Wait for search results
async function waitForSearchResults(page: Page, timeout = 10000) {
    await page.waitForSelector('[data-testid="search-results"]', { timeout })
}

// Helper: Wait for deep search progress
async function waitForDeepSearchProgress(page: Page, timeout = 30000) {
    await page.waitForSelector('[data-testid="scraping-progress"]', { timeout })
}

test.describe('Web Search E2E', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
    })

    test.describe('Scenario 1: Basic Search Workflow', () => {
        test('should execute basic web search and display results', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            // Navigate to web search page
            await navigateToWebSearch(page)

            // Enter search query
            const searchInput = page.locator('input[placeholder*="search"]').first()
            await searchInput.fill('typescript best practices')

            // Verify search button is enabled
            const searchButton = page.locator('button[type="submit"]').first()
            await expect(searchButton).toBeEnabled()

            // Execute search
            await searchButton.click()

            // Wait for loading state
            await expect(page.locator('[data-testid="search-loading"]')).toBeVisible({ timeout: 2000 })

            // Wait for results
            await waitForSearchResults(page)

            // Verify results displayed
            const results = page.locator('[data-testid="search-result-item"]')
            await expect(results.first()).toBeVisible()

            // Verify result structure
            await expect(results.first().locator('[data-testid="result-title"]')).toBeVisible()
            await expect(results.first().locator('[data-testid="result-url"]')).toBeVisible()
            await expect(results.first().locator('[data-testid="result-snippet"]')).toBeVisible()

            // Verify cost display
            await expect(page.locator('[data-testid="search-cost"]')).toBeVisible()

            // Verify at least 5 results
            await expect(results).toHaveCount(5, { timeout: 5000 })
        })

        test('should show empty state for query with no results', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Search for unlikely query
            const searchInput = page.locator('input[placeholder*="search"]').first()
            await searchInput.fill('xyzabc123nonexistentquery999')

            await page.locator('button[type="submit"]').first().click()

            // Wait for results area
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Verify empty state message
            await expect(page.locator('text=/no results found/i')).toBeVisible()
        })

        test('should allow search type selection', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Select search type dropdown
            const typeSelector = page.locator('[data-testid="search-type-selector"]').first()
            await typeSelector.click()

            // Select "News" type
            await page.locator('text="News"').click()

            // Verify selection
            await expect(typeSelector).toContainText('News')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('latest technology news')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Verify results displayed
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })
    })

    test.describe('Scenario 2: Deep Search with Progress', () => {
        test('should execute deep search and show real-time progress', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            const deepSearchToggle = page.locator('[data-testid="deep-search-toggle"]').first()
            await deepSearchToggle.click()

            // Verify toggle enabled
            await expect(deepSearchToggle).toBeChecked()

            // Configure page depth
            const pageDepthInput = page.locator('input[data-testid="page-depth-input"]').first()
            await expect(pageDepthInput).toBeVisible()
            await expect(pageDepthInput).toBeEnabled()

            await pageDepthInput.fill('3')

            // Enter search query
            await page.locator('input[placeholder*="search"]').first().fill('react hooks tutorial')

            // Execute search
            await page.locator('button[type="submit"]').first().click()

            // Wait for initial results (should appear quickly)
            await waitForSearchResults(page, 5000)

            // Verify progress indicator appears
            await waitForDeepSearchProgress(page)

            // Verify progress shows status updates
            const progressStatus = page.locator('[data-testid="scraping-status"]').first()
            await expect(progressStatus).toBeVisible()

            // Wait for status changes (fetching → parsing → chunking → complete)
            await expect(progressStatus).toContainText(/fetching|parsing|chunking|complete/i, { timeout: 20000 })

            // Verify progress percentage
            const progressBar = page.locator('[data-testid="progress-bar"]').first()
            await expect(progressBar).toBeVisible()

            // Wait for completion
            await expect(progressStatus).toContainText('complete', { timeout: 30000 })

            // Verify deep search pages displayed
            const webPagePreviews = page.locator('[data-testid="webpage-preview"]')
            await expect(webPagePreviews.first()).toBeVisible({ timeout: 5000 })

            // Verify semantic chunks displayed
            const chunks = page.locator('[data-testid="content-chunk"]')
            await expect(chunks.first()).toBeVisible()
        })

        test('should allow configuring page depth (1-10)', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            const pageDepthInput = page.locator('input[data-testid="page-depth-input"]').first()

            // Test minimum (1)
            await pageDepthInput.fill('1')
            await expect(pageDepthInput).toHaveValue('1')

            // Test maximum (10)
            await pageDepthInput.fill('10')
            await expect(pageDepthInput).toHaveValue('10')

            // Test clamping below minimum
            await pageDepthInput.fill('0')
            await pageDepthInput.blur()
            await expect(pageDepthInput).toHaveValue('1')

            // Test clamping above maximum
            await pageDepthInput.fill('15')
            await pageDepthInput.blur()
            await expect(pageDepthInput).toHaveValue('10')
        })

        test('should show progress for multiple pages', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search with 5 pages
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('5')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('javascript async await')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await waitForDeepSearchProgress(page)

            // Verify individual page progress
            const pageItems = page.locator('[data-testid="page-progress-item"]')
            await expect(pageItems).toHaveCount(5, { timeout: 10000 })

            // Verify at least one page shows status
            await expect(pageItems.first().locator('[data-testid="page-status"]')).toBeVisible()
        })
    })

    test.describe('Scenario 3: Export Functionality', () => {
        test('should export search results to JSON', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('node.js performance')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Setup download listener
            const downloadPromise = page.waitForEvent('download')

            // Click export JSON button
            await page.locator('button[data-testid="export-json"]').first().click()

            // Wait for download
            const download = await downloadPromise
            expect(download.suggestedFilename()).toContain('.json')
        })

        test('should export search results to CSV', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('python data science')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Setup download listener
            const downloadPromise = page.waitForEvent('download')

            // Click export CSV button
            await page.locator('button[data-testid="export-csv"]').first().click()

            // Wait for download
            const download = await downloadPromise
            expect(download.suggestedFilename()).toContain('.csv')
        })
    })

    test.describe('Scenario 4: Search Statistics', () => {
        test('should display search statistics', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to statistics tab/section
            const statsTab = page.locator('[data-testid="stats-tab"]').first()
            if (await statsTab.isVisible()) {
                await statsTab.click()
            }

            // Verify statistics displayed
            await expect(page.locator('[data-testid="total-searches"]')).toBeVisible({ timeout: 5000 })
            await expect(page.locator('[data-testid="total-webpages"]')).toBeVisible()
            await expect(page.locator('[data-testid="total-chunks"]')).toBeVisible()
            await expect(page.locator('[data-testid="avg-chunks-per-page"]')).toBeVisible()

            // Verify numeric values
            const totalSearches = page.locator('[data-testid="total-searches"]')
            await expect(totalSearches).toContainText(/\d+/)
        })

        test('should refresh statistics', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to statistics
            const statsTab = page.locator('[data-testid="stats-tab"]').first()
            if (await statsTab.isVisible()) {
                await statsTab.click()
            }

            // Get initial value
            const totalSearches = page.locator('[data-testid="total-searches"]')
            await totalSearches.waitFor({ state: 'visible', timeout: 5000 })

            // Click refresh button
            const refreshButton = page.locator('button[data-testid="refresh-stats"]').first()
            await refreshButton.click()

            // Verify loading state
            await expect(page.locator('[data-testid="stats-loading"]')).toBeVisible({ timeout: 2000 })

            // Wait for stats to reload
            await expect(totalSearches).toBeVisible({ timeout: 5000 })
        })
    })

    test.describe('Scenario 5: Error Handling', () => {
        test('should handle empty query gracefully', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Try to submit empty query
            const searchButton = page.locator('button[type="submit"]').first()

            // Verify button is disabled for empty input
            await expect(searchButton).toBeDisabled()

            // Enter and clear input
            const searchInput = page.locator('input[placeholder*="search"]').first()
            await searchInput.fill('test')
            await expect(searchButton).toBeEnabled()

            await searchInput.fill('')
            await expect(searchButton).toBeDisabled()
        })

        test('should display error message on API failure', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept API call and force error
            await page.route('**/api/v1/insights/search', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                })
            })

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('test query')
            await page.locator('button[type="submit"]').first().click()

            // Verify error message displayed
            await expect(page.locator('[data-testid="search-error"]')).toBeVisible({ timeout: 5000 })
            await expect(page.locator('text=/error|failed/i')).toBeVisible()
        })

        test('should allow retry after error', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            let requestCount = 0

            // Intercept API call - fail first, succeed second
            await page.route('**/api/v1/insights/search', route => {
                requestCount++
                if (requestCount === 1) {
                    route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Internal Server Error' }),
                    })
                } else {
                    route.continue()
                }
            })

            // Execute search (will fail)
            await page.locator('input[placeholder*="search"]').first().fill('test query')
            await page.locator('button[type="submit"]').first().click()

            // Verify error displayed
            await expect(page.locator('[data-testid="search-error"]')).toBeVisible({ timeout: 5000 })

            // Click retry button
            const retryButton = page.locator('button[data-testid="retry-search"]').first()
            await retryButton.click()

            // Verify success on retry
            await waitForSearchResults(page)
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })
    })

    test.describe('Scenario 6: Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 })

            await navigateToWebSearch(page)

            // Verify search input visible
            await expect(page.locator('input[placeholder*="search"]').first()).toBeVisible()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('mobile search test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Verify results displayed properly
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })

        test('should work on tablet viewport', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            // Set tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 })

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('tablet search test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Verify results displayed
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })
    })

    test.describe('Scenario 7: Accessibility', () => {
        test('should be keyboard navigable', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Tab to search input
            await page.keyboard.press('Tab')

            // Type query
            await page.keyboard.type('accessibility test')

            // Tab to search button
            await page.keyboard.press('Tab')

            // Press Enter to submit
            await page.keyboard.press('Enter')

            // Wait for results
            await waitForSearchResults(page)

            // Verify results displayed
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })

        test('should have proper ARIA labels', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Verify search input has label
            const searchInput = page.locator('input[placeholder*="search"]').first()
            await expect(searchInput).toHaveAttribute('aria-label', /search/i)

            // Verify search button has label
            const searchButton = page.locator('button[type="submit"]').first()
            await expect(searchButton).toHaveAttribute('aria-label', /search|submit/i)
        })
    })

    test.describe('Scenario 8: Cost Tracking', () => {
        test('should display search cost', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('cost tracking test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await waitForSearchResults(page)

            // Verify cost displayed
            const costDisplay = page.locator('[data-testid="search-cost"]').first()
            await expect(costDisplay).toBeVisible()

            // Verify cost format (should be currency format)
            await expect(costDisplay).toContainText(/\$\d+\.\d{2}/)
        })

        test('should show cost breakdown for deep search', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('2')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('deep search cost test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results and deep search completion
            await waitForSearchResults(page)
            await expect(page.locator('[data-testid="scraping-status"]').first()).toContainText('complete', { timeout: 30000 })

            // Verify cost breakdown
            await expect(page.locator('[data-testid="search-cost-breakdown"]').first()).toBeVisible()
            await expect(page.locator('[data-testid="deep-search-cost"]').first()).toBeVisible()
        })
    })
})
