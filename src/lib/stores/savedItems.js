import { writable, get } from 'svelte/store';
import { userSubscription } from './subscription';

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
                const result = await chrome.storage.local.get(['savedItems', 'savedCollections']);
                set({
                    items: result.savedItems || [],
                    collections: result.savedCollections || [],
                    loading: false,
                    error: null
                });
            } catch (e) {
                update(s => ({ ...s, loading: false, error: e.message }));
            }
        },

        saveItem: async (article, collectionId = 'default') => {
            const state = get(savedItems);
            const subscription = get(userSubscription);

            // Check if already saved
            const existingIndex = state.items.findIndex(item => item.link === article.link);

            if (existingIndex >= 0) {
                // Already saved, maybe update collection?
                // For now, just return success as "idempotent" save
                return { success: true, message: 'Already saved' };
            }

            // Check limits for Free tier
            if (!subscription.isPro && state.items.length >= FREE_LIMIT) {
                return {
                    success: false,
                    error: `Free tier is limited to ${FREE_LIMIT} saved items. Upgrade to Pro for unlimited saves!`
                };
            }

            // Create new item object
            const newItem = {
                ...article,
                savedAt: Date.now(),
                collectionId: collectionId
            };

            const newItems = [newItem, ...state.items];

            // Persist
            await chrome.storage.local.set({ savedItems: newItems });

            update(s => ({ ...s, items: newItems }));
            return { success: true };
        },

        removeItem: async (articleLink) => {
            const state = get(savedItems);
            const newItems = state.items.filter(item => item.link !== articleLink);

            await chrome.storage.local.set({ savedItems: newItems });
            update(s => ({ ...s, items: newItems }));
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

            const state = get(savedItems);
            const newCollection = {
                id: crypto.randomUUID(),
                name,
                createdAt: Date.now()
            };

            const newCollections = [...state.collections, newCollection];

            await chrome.storage.local.set({ savedCollections: newCollections });
            update(s => ({ ...s, collections: newCollections }));
            return { success: true, collection: newCollection };
        },

        deleteCollection: async (id) => {
            const state = get(savedItems);

            // Move items in this collection to default? Or delete them?
            // Decision: Move to default (null/undefined collectionId) to be safe
            const newItems = state.items.map(item => {
                if (item.collectionId === id) {
                    return { ...item, collectionId: 'default' };
                }
                return item;
            });

            const newCollections = state.collections.filter(c => c.id !== id);

            await chrome.storage.local.set({
                savedItems: newItems,
                savedCollections: newCollections
            });

            update(s => ({ ...s, items: newItems, collections: newCollections }));
        },

        moveItem: async (articleLink, targetCollectionId) => {
            const state = get(savedItems);
            const newItems = state.items.map(item => {
                if (item.link === articleLink) {
                    return { ...item, collectionId: targetCollectionId === 'all' ? 'default' : targetCollectionId };
                }
                return item;
            });

            await chrome.storage.local.set({ savedItems: newItems });
            update(s => ({ ...s, items: newItems }));
            return { success: true };
        }
    };
}

export const savedItems = createSavedItemsStore();
