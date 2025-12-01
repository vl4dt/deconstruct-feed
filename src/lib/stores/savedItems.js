import { writable, get } from 'svelte/store';
import { userSubscription } from './subscription';
import * as savedItemsDB from '../db/savedItemsDB.js';
import { fetchArticleContent } from '../content/contentFetcher.js';

const MIGRATION_KEY = 'savedItems_migrated_to_indexeddb';

async function migrateIfNeeded() {
    try {
        const result = await chrome.storage.local.get(MIGRATION_KEY);
        if (result[MIGRATION_KEY]) {
            return; // Already migrated
        }

        console.log('🔄 Migrating saved items from chrome.storage to IndexedDB...');

        const data = await chrome.storage.local.get(['savedItems', 'savedCollections']);
        const items = data.savedItems || [];
        const collections = data.savedCollections || [];

        // Migrate saved items
        for (const item of items) {
            const collection = item.collectionId || 'all';
            await savedItemsDB.saveItem(item, collection);
        }

        // Migrate collections
        for (const collection of collections) {
            await savedItemsDB.createCollection(collection.name);
        }

        await chrome.storage.local.set({ [MIGRATION_KEY]: true });

        // Remove old data
        await chrome.storage.local.remove(['savedItems', 'savedCollections']);

        console.log(`✅ Migrated ${items.length} saved items and ${collections.length} collections to IndexedDB`);
    } catch (error) {
        console.error('Error migrating saved items:', error);
    }
}

function createSavedItemsStore() {
    const { subscribe, set, update } = writable({
        items: [],
        collections: [],
        loading: true,
        error: null
    });

    const FREE_LIMIT = 20;

    return {
        subscribe,
        init: async () => {
            try {
                await migrateIfNeeded();

                const items = await savedItemsDB.getAllSavedItems();
                const collections = await savedItemsDB.getAllCollections();

                set({
                    items,
                    collections,
                    loading: false,
                    error: null
                });
            } catch (e) {
                update(s => ({ ...s, loading: false, error: e.message }));
            }
        },

        saveItem: async (article, collectionId = 'all') => {
            const state = get(savedItems);
            const subscription = get(userSubscription);

            // Check if already saved
            const isSaved = await savedItemsDB.isItemSaved(article.link);

            if (isSaved) {
                return { success: true, message: 'Already saved' };
            }

            // Check limits for Free tier
            if (!subscription.isPro && state.items.length >= FREE_LIMIT) {
                return {
                    success: false,
                    error: `Free tier is limited to ${FREE_LIMIT} saved items. Upgrade to Pro for unlimited saves!`
                };
            }

            // Save to IndexedDB
            await savedItemsDB.saveItem(article, collectionId);

            // Update store
            const items = await savedItemsDB.getAllSavedItems();
            update(s => ({ ...s, items }));

            // Background fetch content for search
            fetchArticleContent(article.link).then(async (content) => {
                if (content) {
                    await savedItemsDB.updateItem(article.link, { content });
                    // Update store with new content so it's searchable immediately
                    const updatedItems = await savedItemsDB.getAllSavedItems();
                    update(s => ({ ...s, items: updatedItems }));
                }
            });

            return { success: true };
        },

        removeItem: async (articleLink) => {
            await savedItemsDB.unsaveItem(articleLink);

            const items = await savedItemsDB.getAllSavedItems();
            update(s => ({ ...s, items }));
        },

        isSaved: (articleLink) => {
            const state = get(savedItems);
            return state.items.some(item => item.link === articleLink);
        },

        // Pro Feature: Collections
        createCollection: async (name) => {
            const subscription = get(userSubscription);
            if (!subscription.isPro) {
                return { success: false, error: 'Collections are a Pro feature.' };
            }

            try {
                const collection = await savedItemsDB.createCollection(name);
                const collections = await savedItemsDB.getAllCollections();
                update(s => ({ ...s, collections }));
                return { success: true, collection };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        deleteCollection: async (id) => {
            await savedItemsDB.deleteCollection(id);

            const items = await savedItemsDB.getAllSavedItems();
            const collections = await savedItemsDB.getAllCollections();
            update(s => ({ ...s, items, collections }));
        },

        moveItem: async (articleLink, targetCollectionId) => {
            const collectionId = targetCollectionId === 'all' ? 'all' : targetCollectionId;
            await savedItemsDB.moveToCollection(articleLink, collectionId);

            const items = await savedItemsDB.getAllSavedItems();
            update(s => ({ ...s, items }));
            return { success: true };
        },

        search: async (query) => {
            return await savedItemsDB.searchSavedItems(query);
        }
    };
}

export const savedItems = createSavedItemsStore();
