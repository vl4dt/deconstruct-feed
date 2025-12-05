import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock sharedWorkerBridge before importing savedItems
vi.mock('../../../src/lib/sharedWorkerBridge.js', () => ({
    getSharedWorkerBridge: vi.fn(() => ({
        connected: false,
        init: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        broadcastStateUpdate: vi.fn()
    }))
}));

// Mock contentFetcher
vi.mock('../../../src/lib/content/contentFetcher.js', () => ({
    fetchArticleContent: vi.fn().mockResolvedValue(null)
}));

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

// Mock savedItemsDB
vi.mock('../../../src/lib/db/savedItemsDB.js', () => ({
    saveItem: vi.fn().mockResolvedValue(true),
    getAllSavedItems: vi.fn().mockResolvedValue([]),
    getAllCollections: vi.fn().mockResolvedValue([]),
    createCollection: vi.fn(),
    updateItem: vi.fn(),
    unsaveItem: vi.fn(),
    isItemSaved: vi.fn().mockResolvedValue(false),
    moveToCollection: vi.fn(),
    deleteCollection: vi.fn(),
    searchSavedItems: vi.fn()
}));

// Import mock to control it
import * as mockSavedItemsDB from '../../../src/lib/db/savedItemsDB.js';

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

            // Setup DB mock return
            mockSavedItemsDB.getAllSavedItems.mockResolvedValue([
                { link: 'url1', title: 'Article 1' },
                { link: 'url2', title: 'Article 2' }
            ]);

            await savedItems.init();

            const state = get(savedItems);
            expect(state.items).toHaveLength(2);
            expect(state.loading).toBe(false);
        });

        it('should load collections', async () => {
            mockStorage.savedCollections = [
                { name: 'Collection 1', id: 'coll1' }
            ];

            // Setup DB mock return
            mockSavedItemsDB.getAllCollections.mockResolvedValue([
                { name: 'Collection 1', id: 'coll1' }
            ]);

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
            // We need to manually update the store mock return or rely on the store calling getAllSavedItems again
            // The store calls getAllSavedItems after saveItem.
            // So we should update the mock to return the new item.
            expect(mockSavedItemsDB.saveItem).toHaveBeenCalledWith(article, 'all');
        });

        it('should not save duplicate article', async () => {
            await savedItems.init();

            const article = {
                link: 'https://example.com/article',
                title: 'Test Article'
            };

            mockSavedItemsDB.isItemSaved.mockResolvedValue(true);

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

            expect(mockSavedItemsDB.unsaveItem).toHaveBeenCalledWith('url1');
        });
    });

    describe('isSaved', () => {
        it('should check if article is saved', async () => {
            mockStorage.savedItems = [
                { link: 'url1', title: 'Article 1' }
            ];

            await savedItems.init();

            // Mock the internal check logic or just test the DB call if the store delegates
            // The store implementation: return state.items.some(...)
            // So we need to ensure init() populated the state.

            mockSavedItemsDB.getAllSavedItems.mockResolvedValue([
                { link: 'url1', title: 'Article 1' }
            ]);
            await savedItems.init(); // Re-init to load items

            expect(savedItems.isSaved('url1')).toBe(true);
            expect(savedItems.isSaved('url2')).toBe(false);
        });
    });
});
