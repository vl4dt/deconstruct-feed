import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settings } from '../../../src/lib/stores/settings';
import { get } from 'svelte/store';

describe('settings store', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};

        global.chrome.storage.local.get = vi.fn((keys) => {
            if (keys === 'userSettings') {
                return Promise.resolve({ userSettings: mockStorage.userSettings });
            }
            return Promise.resolve({});
        });

        global.chrome.storage.local.set = vi.fn((items) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
        });
    });

    describe('init', () => {
        it('should initialize with default settings', async () => {
            await settings.init();

            const state = get(settings);
            expect(state).toHaveProperty('autoSummarize');
            expect(state).toHaveProperty('aiProvider');
            expect(state).toHaveProperty('targetLanguage');
        });

        it('should merge saved settings with defaults', async () => {
            mockStorage.userSettings = {
                autoSummarize: false,
                targetLanguage: 'es'
            };

            await settings.init();

            const state = get(settings);
            expect(state.autoSummarize).toBe(false);
            expect(state.targetLanguage).toBe('es');
            expect(state.aiProvider).toBe('chrome'); // Default
        });
    });

    describe('set', () => {
        it('should set a specific setting value', async () => {
            await settings.init();
            await settings.set('aiProvider', 'gemini');

            // Allow time for async update
            await new Promise(resolve => setTimeout(resolve, 10));

            const state = get(settings);
            expect(state.aiProvider).toBe('gemini');
        });

        it('should persist set setting', async () => {
            await settings.init();
            await settings.set('targetLanguage', 'fr');

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockStorage.userSettings.targetLanguage).toBe('fr');
        });
    });

    describe('trending keywords', () => {
        it('should add trending keyword', async () => {
            await settings.init();
            await settings.addTrendingKeyword('AI');

            const state = get(settings);
            expect(state.trendingKeywords).toContain('AI');
        });

        it('should not add duplicate keywords', async () => {
            await settings.init();
            await settings.addTrendingKeyword('AI');
            await settings.addTrendingKeyword('AI');

            const state = get(settings);
            const count = state.trendingKeywords.filter(k => k === 'AI').length;
            expect(count).toBe(1);
        });

        it('should remove trending keyword', async () => {
            await settings.init();
            await settings.addTrendingKeyword('AI');
            await settings.addTrendingKeyword('Tech');
            await settings.removeTrendingKeyword('AI');

            const state = get(settings);
            expect(state.trendingKeywords).not.toContain('AI');
            expect(state.trendingKeywords).toContain('Tech');
        });
    });
});
