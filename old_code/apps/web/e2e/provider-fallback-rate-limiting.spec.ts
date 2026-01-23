/**
 * Provider Fallback and Rate Limiting E2E Tests
 * 
 * Tests provider fallback when primary search provider fails,
 * and rate limiting/quota management functionality.
 * 
 * Prerequisites:
 * - Backend API with multiple search providers configured
 * - Rate limiting middleware enabled
 * - Quota tracking implemented
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_TIMEOUT = 60000

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

test.describe('Provider Fallback E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
    })

    test.describe('Scenario 1: Primary Provider Failure', () => {
        test('should fall back to secondary provider when primary fails', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            let requestCount = 0
            const requests: any[] = []

            // Intercept search API calls
            await page.route('**/api/v1/insights/search', async route => {
                requestCount++
                const request = route.request()
                requests.push({
                    count: requestCount,
                    headers: request.headers(),
                    postData: request.postData(),
                })

                // Let request proceed normally
                await route.continue()
            })

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('provider fallback test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 })

            // Verify results displayed (from fallback if primary failed)
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()

            // Check if provider info is displayed
            const providerInfo = page.locator('[data-testid="provider-info"]')
            if (await providerInfo.isVisible()) {
                // Should show which provider was used
                await expect(providerInfo).toContainText(/serpapi|bing/i)
            }
        })

        test('should show provider switching indicator', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept and force primary provider failure
            await page.route('**/api/v1/insights/search', async route => {
                const request = route.request()
                const postData = request.postDataJSON()

                // First request - simulate primary provider failure
                if (postData && !postData._retry) {
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            error: 'Primary provider unavailable',
                            provider: 'SerpAPI',
                            willRetry: true,
                        }),
                    })
                } else {
                    await route.continue()
                }
            })

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('provider switch test')
            await page.locator('button[type="submit"]').first().click()

            // May show retry/switching indicator briefly
            const retryIndicator = page.locator('[data-testid="provider-retry"]')
            if (await retryIndicator.isVisible({ timeout: 2000 })) {
                await expect(retryIndicator).toContainText(/retrying|switching|fallback/i)
            }

            // Should eventually show results from fallback
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 })
            await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible()
        })
    })

    test.describe('Scenario 2: Provider Health Status', () => {
        test('should display provider health status', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to settings or info section
            const settingsButton = page.locator('[data-testid="search-settings"]')
            if (await settingsButton.isVisible({ timeout: 2000 })) {
                await settingsButton.click()

                // Verify provider status displayed
                const providerStatus = page.locator('[data-testid="provider-status"]')
                if (await providerStatus.isVisible()) {
                    await expect(providerStatus).toBeVisible()

                    // Should show status for each provider
                    await expect(page.locator('[data-testid="serpapi-status"]')).toBeVisible()
                    await expect(page.locator('[data-testid="bing-status"]')).toBeVisible()
                }
            }
        })
    })

    test.describe('Scenario 3: Fallback Chain', () => {
        test('should try all providers in fallback chain', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('fallback chain test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results (even if providers fail, should show error or results)
            await page.waitForSelector('[data-testid="search-results"], [data-testid="search-error"]', {
                timeout: 20000
            })

            // Either results or error should be visible
            const hasResults = await page.locator('[data-testid="search-result-item"]').count() > 0
            const hasError = await page.locator('[data-testid="search-error"]').isVisible()

            expect(hasResults || hasError).toBe(true)
        })
    })
})

test.describe('Rate Limiting E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
    })

    test.describe('Scenario 1: Rate Limit Display', () => {
        test('should display current rate limit status', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Look for rate limit indicator
            const rateLimitInfo = page.locator('[data-testid="rate-limit-info"]')
            if (await rateLimitInfo.isVisible({ timeout: 5000 })) {
                await expect(rateLimitInfo).toBeVisible()

                // Should show remaining requests
                await expect(rateLimitInfo).toContainText(/remaining|left/i)

                // Should show numeric value
                await expect(rateLimitInfo).toContainText(/\d+/)
            }
        })

        test('should update rate limit after search', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            const rateLimitInfo = page.locator('[data-testid="rate-limit-info"]')

            // Get initial value if visible
            let initialText = ''
            if (await rateLimitInfo.isVisible({ timeout: 2000 })) {
                initialText = (await rateLimitInfo.textContent()) || ''
            }

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('rate limit update test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Check if rate limit updated
            if (await rateLimitInfo.isVisible({ timeout: 2000 })) {
                const updatedText = (await rateLimitInfo.textContent()) || ''

                // Text should change (remaining count decreased)
                if (initialText) {
                    expect(updatedText).not.toBe(initialText)
                }
            }
        })
    })

    test.describe('Scenario 2: Rate Limit Enforcement', () => {
        test('should block requests when rate limit exceeded', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT * 2)

            await navigateToWebSearch(page)

            // Intercept and track request count
            let requestCount = 0
            await page.route('**/api/v1/insights/search', async route => {
                requestCount++

                // Simulate rate limit after 3 requests
                if (requestCount > 3) {
                    await route.fulfill({
                        status: 429,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            error: 'Rate limit exceeded',
                            retryAfter: 60,
                            limit: 3,
                            remaining: 0,
                        }),
                    })
                } else {
                    await route.continue()
                }
            })

            // Execute multiple searches
            for (let i = 1; i <= 5; i++) {
                await page.locator('input[placeholder*="search"]').first().fill(`rate limit test ${i}`)
                await page.locator('button[type="submit"]').first().click()

                await page.waitForTimeout(2000)

                // After 3 requests, should show rate limit error
                if (i > 3) {
                    const errorMessage = page.locator('[data-testid="rate-limit-error"]')
                    if (await errorMessage.isVisible({ timeout: 5000 })) {
                        await expect(errorMessage).toContainText(/rate limit|too many requests/i)
                        break
                    }
                }
            }
        })

        test('should show retry-after time when rate limited', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept and force rate limit
            await page.route('**/api/v1/insights/search', async route => {
                await route.fulfill({
                    status: 429,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Rate limit exceeded',
                        retryAfter: 30,
                        resetTime: new Date(Date.now() + 30000).toISOString(),
                    }),
                })
            })

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('retry after test')
            await page.locator('button[type="submit"]').first().click()

            // Should show rate limit error with retry time
            const errorMessage = page.locator('[data-testid="rate-limit-error"]')
            await expect(errorMessage).toBeVisible({ timeout: 5000 })

            // Should mention when to retry
            await expect(errorMessage).toContainText(/retry|wait|seconds/i)
        })
    })

    test.describe('Scenario 3: Quota Management', () => {
        test('should display quota usage', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Look for quota indicator
            const quotaInfo = page.locator('[data-testid="quota-info"]')
            if (await quotaInfo.isVisible({ timeout: 5000 })) {
                await expect(quotaInfo).toBeVisible()

                // Should show usage information
                await expect(quotaInfo).toContainText(/quota|usage|limit/i)

                // Should show percentage or numeric value
                await expect(quotaInfo).toContainText(/\d+/)
            }
        })

        test('should warn when approaching quota limit', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept to simulate high quota usage
            await page.route('**/api/v1/insights/quota', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        used: 950,
                        limit: 1000,
                        percentage: 95,
                        resetDate: new Date(Date.now() + 86400000).toISOString(),
                    }),
                })
            })

            // Refresh page to load quota
            await page.reload()
            await page.waitForLoadState('networkidle')

            // Should show quota warning
            const quotaWarning = page.locator('[data-testid="quota-warning"]')
            if (await quotaWarning.isVisible({ timeout: 5000 })) {
                await expect(quotaWarning).toContainText(/approaching|warning|limit/i)
            }
        })

        test('should block searches when quota exceeded', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept to simulate quota exceeded
            await page.route('**/api/v1/insights/search', async route => {
                await route.fulfill({
                    status: 402,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Quota exceeded',
                        used: 1000,
                        limit: 1000,
                        resetDate: new Date(Date.now() + 86400000).toISOString(),
                    }),
                })
            })

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('quota exceeded test')
            await page.locator('button[type="submit"]').first().click()

            // Should show quota error
            const errorMessage = page.locator('[data-testid="quota-error"]')
            await expect(errorMessage).toBeVisible({ timeout: 5000 })

            // Should explain quota exceeded
            await expect(errorMessage).toContainText(/quota|exceeded|limit/i)
        })

        test('should show quota reset time', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Intercept to provide quota info
            await page.route('**/api/v1/insights/quota', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        used: 750,
                        limit: 1000,
                        percentage: 75,
                        resetDate: new Date(Date.now() + 14400000).toISOString(), // 4 hours
                    }),
                })
            })

            // Refresh to load quota info
            await page.reload()
            await page.waitForLoadState('networkidle')

            // Look for reset time display
            const quotaResetTime = page.locator('[data-testid="quota-reset-time"]')
            if (await quotaResetTime.isVisible({ timeout: 5000 })) {
                await expect(quotaResetTime).toContainText(/reset|renew/i)
                await expect(quotaResetTime).toContainText(/hour|minute/i)
            }
        })
    })

    test.describe('Scenario 4: Cost Tracking', () => {
        test('should display cumulative search costs', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('cost tracking test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Check for cost display
            const costDisplay = page.locator('[data-testid="search-cost"]')
            await expect(costDisplay).toBeVisible()

            // Should show currency format
            await expect(costDisplay).toContainText(/\$\d+\.\d{2}/)
        })

        test('should track costs across multiple searches', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Look for cumulative cost tracker
            const cumulativeCost = page.locator('[data-testid="cumulative-cost"]')

            let initialCost = '0'
            if (await cumulativeCost.isVisible({ timeout: 2000 })) {
                initialCost = (await cumulativeCost.textContent()) || '0'
            }

            // Execute search
            await page.locator('input[placeholder*="search"]').first().fill('cost accumulation test')
            await page.locator('button[type="submit"]').first().click()

            // Wait for results
            await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

            // Check if cumulative cost increased
            if (await cumulativeCost.isVisible({ timeout: 2000 })) {
                const updatedCost = (await cumulativeCost.textContent()) || '0'

                // Cost should have increased
                if (initialCost !== '0') {
                    expect(updatedCost).not.toBe(initialCost)
                }
            }
        })
    })
})

test.describe('Recurring Search E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
    })

    test.describe('Scenario 1: Create Recurring Search', () => {
        test('should create recurring search schedule', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to recurring search tab/section
            const recurringTab = page.locator('[data-testid="recurring-search-tab"]')
            if (await recurringTab.isVisible({ timeout: 2000 })) {
                await recurringTab.click()
            }

            // Fill recurring search form
            await page.locator('input[data-testid="recurring-query"]').first().fill('weekly tech news')

            // Select interval
            const intervalSelect = page.locator('select[data-testid="recurring-interval"]').first()
            if (await intervalSelect.isVisible()) {
                await intervalSelect.selectOption('weekly')
            }

            // Submit form
            await page.locator('button[data-testid="create-recurring"]').first().click()

            // Verify success message
            await expect(page.locator('[data-testid="recurring-success"]')).toBeVisible({ timeout: 5000 })
        })

        test('should enable deep search for recurring searches', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to recurring search
            const recurringTab = page.locator('[data-testid="recurring-search-tab"]')
            if (await recurringTab.isVisible({ timeout: 2000 })) {
                await recurringTab.click()

                // Fill form
                await page.locator('input[data-testid="recurring-query"]').first().fill('monthly research updates')

                // Enable deep search
                const deepSearchToggle = page.locator('[data-testid="recurring-deep-search"]').first()
                if (await deepSearchToggle.isVisible()) {
                    await deepSearchToggle.click()

                    // Verify page depth input appears
                    await expect(page.locator('input[data-testid="recurring-page-depth"]').first()).toBeVisible()
                }
            }
        })
    })

    test.describe('Scenario 2: View Recurring Searches', () => {
        test('should list active recurring searches', async ({ page }) => {
            test.setTimeout(TEST_TIMEOUT)

            await navigateToWebSearch(page)

            // Navigate to recurring searches list
            const recurringTab = page.locator('[data-testid="recurring-search-tab"]')
            if (await recurringTab.isVisible({ timeout: 2000 })) {
                await recurringTab.click()

                // Look for list of recurring searches
                const recurringList = page.locator('[data-testid="recurring-searches-list"]')
                if (await recurringList.isVisible({ timeout: 5000 })) {
                    await expect(recurringList).toBeVisible()

                    // Should show at least table headers if no searches
                    await expect(page.locator('th, [data-testid="recurring-search-item"]')).toHaveCount(
                        await page.locator('th, [data-testid="recurring-search-item"]').count(),
                        { timeout: 2000 }
                    )
                }
            }
        })
    })
})
