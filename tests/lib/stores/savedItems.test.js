import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Create mock userSubscription BEFORE importing savedItems
const mockUserSubscription = {
    subscribe: vi.fn((callback) => {
        callback({ isPro: false, loading: false });
        return { unsubscribe: vi.fn() };
    }),
    isPro: false,
    loading: false
};

// Mock the subscription module
vi.mock('../../../src/lib/stores/subscription', () => ({
    userSubscription: mockUserSubscription
}));

// Import after mocking
const { savedItems } = await import('../../../src/lib/stores/savedItems');

describe('savedItems store', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};

        global.chrome.storage.local.get = vi.fn((keys) => {
            if (Array.isArray(keys)) {
                const result = {};
                keys.forEach(key => {
                    if (mockStorage[key]) result[key] = mockStorage[key];
                });
                return Promise.resolve(result);
            }
            return Promise.resolve({});
        });

        global.chrome.storage.local.set = vi.fn((items) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
        });
    });

    describe('init', () => {
        it('should load saved items', async () => {
            mockStorage.savedItems = [
                { link: 'url1', title: 'Article 1' },
                { link: 'url2', title: 'Article 2' }
            ];

            await savedItems.init();

            const state = get(savedItems);
            expect(state.items).toHaveLength(2);
            expect(state.loading).toBe(false);
        });

        it('should load collections', async () => {
            mockStorage.savedCollections = [
                { name: 'Collection 1', id: 'coll1' }
            ];

            await savedItems.init();

            const state = get(savedItems);
            expect(state.collections).toHaveLength(1);
        });
    });

    describe('saveItem', () => {
        it('should save new article', async () => {
            await savedItems.init();

            const article = {
                link: 'https://example.com/article',
                title: 'Test Article',
                description: 'Test'
            };

            const result = await savedItems.saveItem(article);

            expect(result.success).toBe(true);
            const state = get(savedItems);
            expect(state.items).toHaveLength(1);
            expect(state.items[0].link).toBe(article.link);
        });

        it('should not save duplicate article', async () => {
            await savedItems.init();

            const article = {
                link: 'https://example.com/article',
                title: 'Test Article'
            };

            await savedItems.saveItem(article);
            const result = await savedItems.saveItem(article);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Already saved');

            const state = get(savedItems);
            expect(state.items).toHaveLength(1);
        });
    });

    describe('removeItem', () => {
        it('should remove article by link', async () => {
            mockStorage.savedItems = [
                { link: 'url1', title: 'Article 1' },
                { link: 'url2', title: 'Article 2' }
            ];

            await savedItems.init();
            await savedItems.removeItem('url1');

            const state = get(savedItems);
            expect(state.items).toHaveLength(1);
            expect(state.items[0].link).toBe('url2');
        });
    });

    describe('isSaved', () => {
        it('should check if article is saved', async () => {
            mockStorage.savedItems = [
                { link: 'url1', title: 'Article 1' }
            ];

            await savedItems.init();

            expect(savedItems.isSaved('url1')).toBe(true);
            expect(savedItems.isSaved('url2')).toBe(false);
        });
    });
});
