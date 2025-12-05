import { test, expect } from '@playwright/test';

test.describe('Deconstruct Feed Extension - Popup', () => {
    test('should load popup and display feed', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);

        // Wait for the app to load
        await page.waitForSelector('.popup-container', { timeout: 5000 });

        // Check that the header is visible
        await expect(page.locator('header')).toBeVisible();

        // Check for navigation buttons
        await expect(page.locator('button:has-text("Feed")')).toBeVisible();
    });

    test('should navigate between views', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Click on Trending button
        const trendingBtn = page.locator('button', { hasText: /trending/i });
        if (await trendingBtn.isVisible()) {
            await trendingBtn.click();
            await page.waitForTimeout(500);

            // Should be in trending view
            await expect(page.locator('.trending-view, [class*="trending"]')).toBeVisible();
        }
    });

    test('should open settings', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Click settings button (gear icon)
        const settingsBtn = page.locator('button[title*="settings"], button:has(svg)').first();
        await settingsBtn.click();
        await page.waitForTimeout(500);

        // Should show settings view
        const settingsHeader = page.locator('h2, h3', { hasText: /settings/i });
        await expect(settingsHeader).toBeVisible();
    });
});

test.describe('Deconstruct Feed Extension - Settings', () => {
    test('should toggle AI provider', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Navigate to settings
        const settingsBtn = page.locator('button[title*="settings"], button:has(svg)').first();
        await settingsBtn.click();
        await page.waitForTimeout(500);

        // Find AI Provider dropdown
        const providerSelect = page.locator('select', { has: page.locator('option:has-text("Chrome AI")') });
        if (await providerSelect.isVisible()) {
            await providerSelect.selectOption('gemini');
            await page.waitForTimeout(300);

            // Check if Gemini settings appeared
            const geminiKeyInput = page.locator('input[placeholder*="Gemini"]');
            await expect(geminiKeyInput).toBeVisible();
        }
    });

    test('should change target language for translation', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Navigate to settings
        const settingsBtn = page.locator('button[title*="settings"], button:has(svg)').first();
        await settingsBtn.click();
        await page.waitForTimeout(500);

        // Find translation language selector
        const langSelect = page.locator('select#target-language');
        if (await langSelect.isVisible()) {
            await langSelect.selectOption('es');
            await page.waitForTimeout(300);

            // Verify selection
            const selectedValue = await langSelect.inputValue();
            expect(selectedValue).toBe('es');
        }
    });
});

test.describe('Deconstruct Feed Extension - News Feed', () => {
    test('should load news articles', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Wait for articles to load (with longer timeout for network)
        await page.waitForSelector('.article, [class*="article"]', { timeout: 15000 });

        // Check that at least one article is visible
        const articles = page.locator('.article, [class*="article"]');
        const count = await articles.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should refresh news feed', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector('.popup-container');

        // Find and click refresh button
        const refreshBtn = page.locator('button[title*="refresh"], button:has(svg[class*="refresh"])');
        if (await refreshBtn.isVisible()) {
            await refreshBtn.click();

            // Wait for loading indicator or articles to reload
            await page.waitForTimeout(2000);

            // Should still have articles after refresh
            const articles = page.locator('.article, [class*="article"]');
            const count = await articles.count();
            expect(count).toBeGreaterThan(0);
        }
    });
});
