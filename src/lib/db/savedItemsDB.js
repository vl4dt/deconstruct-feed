import db from './indexedDB.js';

const SAVED_ITEMS_STORE = 'savedItems';
const COLLECTIONS_STORE = 'collections';

/**
 * Get all saved items, optionally filtered by collection
 */
export async function getAllSavedItems(collectionId = null) {
    try {
        if (collectionId && collectionId !== 'all') {
            return await db.getAll(SAVED_ITEMS_STORE, 'collection', collectionId);
        }
        return await db.getAll(SAVED_ITEMS_STORE);
    } catch (error) {
        console.error('Error getting saved items:', error);
        return [];
    }
}

/**
 * Save an item
 */
export async function saveItem(article, collection = 'all') {
    try {
        const savedItem = {
            ...article,
            savedAt: Date.now(),
            collection
        };
        await db.put(SAVED_ITEMS_STORE, savedItem);
        console.log(`💾 Saved article to collection: ${collection}`);
    } catch (error) {
        console.error('Error saving item:', error);
    }
}

/**
 * Update an existing saved item
 */
export async function updateItem(link, updates) {
    try {
        const item = await db.get(SAVED_ITEMS_STORE, link);
        if (item) {
            const updatedItem = { ...item, ...updates };
            await db.put(SAVED_ITEMS_STORE, updatedItem);
            // console.log(`Updated article: ${link}`);
        }
    } catch (error) {
        console.error('Error updating item:', error);
    }
}

/**
 * Unsave an item
 */
export async function unsaveItem(link) {
    try {
        await db.delete(SAVED_ITEMS_STORE, link);
        console.log('🗑️ Removed saved article');
    } catch (error) {
        console.error('Error unsaving item:', error);
    }
}

/**
 * Check if item is saved
 */
export async function isItemSaved(link) {
    try {
        const item = await db.get(SAVED_ITEMS_STORE, link);
        return !!item;
    } catch (error) {
        console.error('Error checking if item is saved:', error);
        return false;
    }
}

/**
 * Search saved items
 */
export async function searchSavedItems(query) {
    try {
        if (!query || query.trim() === '') {
            return await getAllSavedItems();
        }

        const items = await db.getAll(SAVED_ITEMS_STORE);
        const lowerQuery = query.toLowerCase();

        return items.filter(item => {
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const content = (item.content || '').toLowerCase();

            return title.includes(lowerQuery) ||
                description.includes(lowerQuery) ||
                content.includes(lowerQuery);
        });
    } catch (error) {
        console.error('Error searching saved items:', error);
        return [];
    }
}

/**
 * Move item to different collection
 */
export async function moveToCollection(link, newCollection) {
    try {
        const item = await db.get(SAVED_ITEMS_STORE, link);
        if (item) {
            item.collection = newCollection;
            await db.put(SAVED_ITEMS_STORE, item);
            console.log(`Moved article to collection: ${newCollection}`);
        }
    } catch (error) {
        console.error('Error moving item:', error);
    }
}

/**
 * Get all collections
 */
export async function getAllCollections() {
    try {
        return await db.getAll(COLLECTIONS_STORE);
    } catch (error) {
        console.error('Error getting collections:', error);
        return [];
    }
}

/**
 * Create a new collection
 */
export async function createCollection(name) {
    try {
        const collection = {
            id: `collection_${Date.now()}`,
            name,
            createdAt: Date.now()
        };
        await db.put(COLLECTIONS_STORE, collection);
        console.log(`📁 Created collection: ${name}`);
        return collection;
    } catch (error) {
        console.error('Error creating collection:', error);
        throw error;
    }
}

/**
 * Delete a collection and move items to 'all'
 */
export async function deleteCollection(collectionId) {
    try {
        // Move all items in this collection to 'all'
        const items = await db.getAll(SAVED_ITEMS_STORE, 'collection', collectionId);
        for (const item of items) {
            item.collection = 'all';
            await db.put(SAVED_ITEMS_STORE, item);
        }

        // Delete the collection
        await db.delete(COLLECTIONS_STORE, collectionId);
        console.log(`🗑️ Deleted collection and moved items to 'all'`);
    } catch (error) {
        console.error('Error deleting collection:', error);
    }
}

/**
 * Get statistics
 */
export async function getStats() {
    try {
        const items = await db.getAll(SAVED_ITEMS_STORE);
        const collections = await db.getAll(COLLECTIONS_STORE);

        const stats = {
            totalSaved: items.length,
            byCollection: {},
            oldestItem: null,
            newestItem: null
        };

        items.forEach((item) => {
            const coll = item.collection || 'all';
            stats.byCollection[coll] = (stats.byCollection[coll] || 0) + 1;

            if (!stats.oldestItem || item.savedAt < stats.oldestItem) {
                stats.oldestItem = item.savedAt;
            }

            if (!stats.newestItem || item.savedAt > stats.newestItem) {
                stats.newestItem = item.savedAt;
            }
        });

        stats.totalCollections = collections.length;

        return stats;
    } catch (error) {
        console.error('Error getting stats:', error);
        return { totalSaved: 0, byCollection: {}, totalCollections: 0 };
    }
}

/**
 * Clear all saved items
 */
export async function clearAll() {
    try {
        await db.clear(SAVED_ITEMS_STORE);
        console.log('🗑️ Cleared all saved items');
    } catch (error) {
        console.error('Error clearing saved items:', error);
    }
}
