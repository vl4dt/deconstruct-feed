import * as feedCacheDB from '../db/feedCacheDB.js';

const MIGRATION_KEY = 'feedCache_migrated_to_indexeddb';
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Migrate data from chrome.storage to IndexedDB (one-time)
 */
async function migrateIfNeeded() {
    try {
        const result = await chrome.storage.local.get(MIGRATION_KEY);
        if (result[MIGRATION_KEY]) {
            return; // Already migrated
        }

        console.log('🔄 Migrating feed cache from chrome.storage to IndexedDB...');

        const allData = await chrome.storage.local.get(null);
        const feedCacheKeys = Object.keys(allData).filter(key => key.startsWith('feed_cache_'));

        let migrated = 0;
        for (const key of feedCacheKeys) {
            const cached = allData[key];
            if (cached && cached.feedUrl && cached.articles) {
                const topic = cached.feedUrl.split('/').pop() || 'unknown';
                await feedCacheDB.setCached(key, topic, cached.articles);
                migrated++;
            }
        }

        await chrome.storage.local.set({ [MIGRATION_KEY]: true });

        if (feedCacheKeys.length > 0) {
            await chrome.storage.local.remove(feedCacheKeys);
        }

        console.log(`✅ Migrated ${migrated} feed cache entries to IndexedDB`);
    } catch (error) {
        console.error('Error migrating feed cache:', error);
    }
}

export async function getCachedFeed(feedUrl, ttl = DEFAULT_TTL) {
    await migrateIfNeeded();
    const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
    const cached = await feedCacheDB.getCached(cacheKey);
    return cached ? cached.articles : null;
}

export async function setCachedFeed(feedUrl, articles) {
    await migrateIfNeeded();
    const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
    const topic = feedUrl.split('/').pop() || 'unknown';
    await feedCacheDB.setCached(cacheKey, topic, articles);
}

export async function invalidateCache(feedUrl) {
    await migrateIfNeeded();
    const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
    await feedCacheDB.getCached(cacheKey).then(cached => {
        if (cached) {
            feedCacheDB.invalidate(cached.topic);
        }
    });
}

export async function invalidateAllCaches() {
    await migrateIfNeeded();
    await feedCacheDB.clearAll();
}

export async function cleanupExpiredCache() {
    await migrateIfNeeded();
    await feedCacheDB.cleanup();
}

export async function getCacheStats() {
    await migrateIfNeeded();
    return await feedCacheDB.getStats();
}

function hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
