import db from './indexedDB.js';

const STORE_NAME = 'aiCache';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHED_RESULTS = 1000; // Much higher limit with IndexedDB

/**
 * Get cached AI result by content hash and analysis type
 */
export async function getCached(contentHash, analysisType) {
    try {
        // Use compound key to get the specific entry
        const cached = await db.get(STORE_NAME, [contentHash, analysisType]);

        if (!cached) {
            return null;
        }

        // Check expiration
        const now = Date.now();
        const age = now - cached.createdAt;

        if (age > DEFAULT_TTL) {
            console.log(`AI cache expired for ${analysisType} (age: ${Math.round(age / (1000 * 60 * 60 * 24))} days)`);
            await db.delete(STORE_NAME, [contentHash, analysisType]);
            return null;
        }

        console.log(`✅ AI cache hit for ${analysisType} (age: ${Math.round(age / (1000 * 60))} min)`);

        // Update last accessed time
        cached.lastAccessedAt = now;
        await db.put(STORE_NAME, cached);

        return cached.result;
    } catch (error) {
        console.error('Error reading AI cache from IndexedDB:', error);
        return null;
    }
}

/**
 * Cache AI result
 */
export async function setCached(contentHash, analysisType, result) {
    try {
        const now = Date.now();

        const cacheData = {
            contentHash,
            analysisType,
            result,
            createdAt: now,
            lastAccessedAt: now
        };

        await db.put(STORE_NAME, cacheData);
        console.log(`💾 Cached AI result for ${analysisType} (${result.length} chars)`);

        // Cleanup old entries
        await cleanup();
    } catch (error) {
        console.error('Error setting AI cache in IndexedDB:', error);
    }
}

/**
 * Clean up old AI cache entries using LRU
 */
export async function cleanup() {
    try {
        const count = await db.count(STORE_NAME);

        if (count <= MAX_CACHED_RESULTS) {
            return;
        }

        // Get all entries sorted by lastAccessedAt
        const all = await db.getAll(STORE_NAME);
        all.sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));

        // Remove oldest entries
        const toRemove = all.slice(0, count - MAX_CACHED_RESULTS);

        for (const item of toRemove) {
            await db.delete(STORE_NAME, [item.contentHash, item.analysisType]);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 Cleaned up ${toRemove.length} old AI cache entries`);
        }
    } catch (error) {
        console.error('Error cleaning up AI cache:', error);
    }
}

/**
 * Clear all AI cache
 */
export async function clearAll() {
    try {
        await db.clear(STORE_NAME);
        console.log('🗑️ Cleared all AI cache entries');
    } catch (error) {
        console.error('Error clearing AI cache:', error);
    }
}

/**
 * Get AI cache statistics
 */
export async function getStats() {
    try {
        const all = await db.getAll(STORE_NAME);

        const stats = {
            totalCached: all.length,
            byType: {},
            totalSize: 0,
            oldestEntry: null,
            newestEntry: null
        };

        all.forEach((item) => {
            const type = item.analysisType || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.totalSize += item.result?.length || 0;

            if (!stats.oldestEntry || item.createdAt < stats.oldestEntry) {
                stats.oldestEntry = item.createdAt;
            }

            if (!stats.newestEntry || item.createdAt > stats.newestEntry) {
                stats.newestEntry = item.createdAt;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting AI cache stats:', error);
        return { totalCached: 0, byType: {}, totalSize: 0 };
    }
}
