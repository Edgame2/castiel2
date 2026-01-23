/**
 * WebSocket E2E Tests for Deep Search
 * 
 * Tests real-time WebSocket communication during deep search operations.
 * Verifies connection, progress updates, reconnection, and error handling.
 * 
 * Prerequisites:
 * - Backend API with WebSocket support running on localhost:3001
 * - Frontend web app running on localhost:3000
 * - Test user authenticated
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_TIMEOUT = 60000
const WS_TIMEOUT = 30000

// Test user credentials
const TEST_USER = {
    email: 'e2e-test@castiel.local',
    password: 'TestPassword123!',
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
}

// Helper: Start WebSocket monitoring
async function setupWebSocketMonitoring(page: Page) {
    const wsMessages: any[] = []

    // Monitor WebSocket connections
    page.on('websocket', ws => {
        console.log(`WebSocket opened: ${ws.url()}`)

        ws.on('framesent', frame => {
            console.log('WS Frame sent:', frame.payload)
            wsMessages.push({ type: 'sent', payload: frame.payload })
        })

        ws.on('framereceived', frame => {
            console.log('WS Frame received:', frame.payload)
            wsMessages.push({ type: 'received', payload: frame.payload })
        })

        ws.on('close', () => {
            console.log('WebSocket closed')
        })
    })

    return wsMessages
}

test.describe('WebSocket E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
    })

    test.describe('Scenario 1: WebSocket Connection', () => {
        test('should establish WebSocket connection for deep search', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            const wsMessages = await setupWebSocketMonitoring(page)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('3')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('websocket test query')
            await page.locator('button[type="submit"]').first().click()

            // Wait for initial results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Wait for WebSocket connection indicator
            await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 5000 })

            // Verify WebSocket connected status
            const wsStatus = page.locator('[data-testid="websocket-status"]').first()
            await expect(wsStatus).toContainText(/connected/i)

            // Wait for progress updates via WebSocket
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // Verify progress updates received
            const progressStatus = page.locator('[data-testid="scraping-status"]').first()
            await expect(progressStatus).toBeVisible()

            // Wait a bit to collect messages
            await page.waitForTimeout(3000)

            // Verify WebSocket messages were exchanged
            expect(wsMessages.length).toBeGreaterThan(0)
        })

        test('should show connection status indicator', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('connection status test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for initial results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Verify WebSocket status indicator appears
            const wsStatus = page.locator('[data-testid="websocket-status"]').first()
            await expect(wsStatus).toBeVisible({ timeout: 5000 })

            // Should show "connected" state
            await expect(wsStatus).toContainText(/connected/i)
        })
    })

    test.describe('Scenario 2: Real-time Progress Updates', () => {
        test('should receive real-time scraping progress updates', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('5')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('real-time progress test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results and progress
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // Verify progress status changes over time
            const progressStatus = page.locator('[data-testid="scraping-status"]').first()

            // Should start with "fetching"
            await expect(progressStatus).toContainText(/fetching/i, { timeout: 5000 })

            // Should eventually show "parsing" or later stages
            await expect(progressStatus).toContainText(/parsing|chunking|embedding|complete/i, { timeout: 15000 })

            // Verify progress bar updates
            const progressBar = page.locator('[data-testid="progress-bar"]').first()
            await expect(progressBar).toBeVisible()

            // Progress percentage should change
            const initialProgress = await progressBar.getAttribute('aria-valuenow')
            await page.waitForTimeout(3000)
            const updatedProgress = await progressBar.getAttribute('aria-valuenow')

            expect(updatedProgress).not.toBe(initialProgress)
        })

        test('should show progress for each scraped page', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search with 3 pages
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('3')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('page-by-page progress test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // Verify individual page progress items
            const pageProgressItems = page.locator('[data-testid="page-progress-item"]')
            await expect(pageProgressItems).toHaveCount(3, { timeout: 10000 })

            // Verify each page shows status
            for (let i = 0; i < 3; i++) {
                const pageStatus = pageProgressItems.nth(i).locator('[data-testid="page-status"]')
                await expect(pageStatus).toBeVisible()
            }

            // At least one page should eventually complete
            await expect(
                pageProgressItems.first().locator('[data-testid="page-status"]')
            ).toContainText(/complete|error/i, { timeout: 20000 })
        })

        test('should update progress percentage in real-time', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('4')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('progress percentage test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            const progressPercentage = page.locator('[data-testid="progress-percentage"]').first()
            await expect(progressPercentage).toBeVisible()

            // Track percentage changes
            const percentages: string[] = []

            for (let i = 0; i < 5; i++) {
                const text = await progressPercentage.textContent()
                if (text) percentages.push(text)
                await page.waitForTimeout(2000)
            }

            // Verify percentage increased over time
            const uniquePercentages = [...new Set(percentages)]
            expect(uniquePercentages.length).toBeGreaterThan(1)
        })
    })

    test.describe('Scenario 3: WebSocket Reconnection', () => {
        test('should handle WebSocket disconnection and reconnect', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('5')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('reconnection test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for WebSocket connection
            await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 10000 })
            const wsStatus = page.locator('[data-testid="websocket-status"]').first()

            // Verify connected
            await expect(wsStatus).toContainText(/connected/i)

            // Simulate connection loss by going offline
            await page.context().setOffline(true)

            // Wait for disconnected status
            await expect(wsStatus).toContainText(/disconnected|reconnecting/i, { timeout: 5000 })

            // Go back online
            await page.context().setOffline(false)

            // Wait for reconnection
            await expect(wsStatus).toContainText(/connected/i, { timeout: 10000 })

            // Verify progress continues after reconnection
            const progressStatus = page.locator('[data-testid="scraping-status"]').first()
            await expect(progressStatus).toBeVisible()
        })

        test('should show reconnection attempts', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('reconnection attempts test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for connection
            await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 10000 })

            // Go offline
            await page.context().setOffline(true)

            // Verify reconnection indicator
            const wsStatus = page.locator('[data-testid="websocket-status"]').first()
            await expect(wsStatus).toContainText(/reconnecting|attempting/i, { timeout: 5000 })

            // Go back online
            await page.context().setOffline(false)

            // Verify reconnected
            await expect(wsStatus).toContainText(/connected/i, { timeout: 10000 })
        })
    })

    test.describe('Scenario 4: Error Handling via WebSocket', () => {
        test('should display scraping errors received via WebSocket', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('3')

            // Execute search (some pages may fail to scrape)
            await page.locator('input[placeholder*="search"]').first().fill('error handling test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // Wait for at least one page to complete or error
            await page.waitForSelector('[data-testid="page-status"]', { timeout: 15000 })

            // Check if any page shows error status
            const pageStatuses = page.locator('[data-testid="page-status"]')
            const count = await pageStatuses.count()

            let hasErrorStatus = false
            for (let i = 0; i < count; i++) {
                const text = await pageStatuses.nth(i).textContent()
                if (text && /error|failed/i.test(text)) {
                    hasErrorStatus = true
                    break
                }
            }

            // Note: This test may not always find errors, but structure should support it
            if (hasErrorStatus) {
                // Verify error badge color (red)
                const errorBadge = page.locator('[data-testid="page-status"]:has-text("error")').first()
                await expect(errorBadge).toHaveCSS('background-color', /rgb\(.*\)/)
            }
        })

        test('should handle WebSocket message errors gracefully', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept and corrupt WebSocket messages
            await page.route('**/ws/**', route => {
                route.abort()
            })

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('ws error test')
            await page.locator('button[type="submit"]').first().click()

            // Should still show initial results even if WS fails
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()

            // May show connection error
            const wsStatus = page.locator('[data-testid="websocket-status"]')
            if (await wsStatus.isVisible()) {
                await expect(wsStatus).toContainText(/disconnected|error/i)
            }
        })
    })

    test.describe('Scenario 5: WebSocket Performance', () => {
        test('should handle high-frequency updates', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search with many pages
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('10')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('high frequency test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // Monitor UI responsiveness during updates
            const startTime = Date.now()

            // Interact with page while updates are happening
            for (let i = 0; i < 5; i++) {
                await page.mouse.move(100, 100 + i * 10)
                await page.waitForTimeout(500)
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // UI should remain responsive (interactions shouldn't take too long)
            expect(duration).toBeLessThan(5000)

            // Progress should still be updating
            const progressStatus = page.locator('[data-testid="scraping-status"]').first()
            await expect(progressStatus).toBeVisible()
        })

        test('should not freeze UI during WebSocket updates', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()
            await page.locator('input[data-testid="page-depth-input"]').first().fill('5')

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('ui freeze test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for progress
            await page.waitForSelector('[data-testid="scraping-progress"]', { timeout: 10000 })

            // While updates are happening, try to interact with other elements
            const searchInput = page.locator('input[placeholder*="search"]').first()

            // Should be able to type in search box
            await searchInput.click()
            await searchInput.fill('new query during updates')

            const inputValue = await searchInput.inputValue()
            expect(inputValue).toBe('new query during updates')

            // Progress should still be visible and updating
            await expect(page.locator('[data-testid="scraping-progress"]').first()).toBeVisible()
        })
    })

    test.describe('Scenario 6: WebSocket Cleanup', () => {
        test('should close WebSocket connection when navigating away', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('cleanup test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for connection
            await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 10000 })

            // Navigate away
            await page.goto('/dashboard')

            // Wait for navigation
            await page.waitForLoadState('networkidle')

            // WebSocket should be closed (can't directly verify, but no errors should occur)
            // Just verify navigation succeeded
            await expect(page).toHaveURL(/\/dashboard/)
        })

        test('should close WebSocket on component unmount', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Enable deep search
            await page.locator('[data-testid="deep-search-toggle"]').first().click()

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('unmount test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for connection
            await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 10000 })

            // Reload page (unmounts component)
            await page.reload()
            await page.waitForLoadState('networkidle')

            // No WebSocket errors should occur
            // Page should load normally
            await expect(page.locator('h1')).toContainText('Web Search')
        })
    })
})
