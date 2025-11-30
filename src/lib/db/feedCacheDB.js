import db from './indexedDB.js';

const STORE_NAME = 'feedCache';
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get cached feed data
 */
export async function getCached(cacheKey) {
    try {
        const cached = await db.get(STORE_NAME, cacheKey);

        if (!cached) {
            return null;
        }

        // Check expiration
        const now = Date.now();
        const age = now - cached.timestamp;

        if (age > DEFAULT_TTL) {
            console.log(`Feed cache expired for ${cacheKey} (age: ${Math.round(age / (1000 * 60))} min)`);
            await db.delete(STORE_NAME, cacheKey);
            return null;
        }

        console.log(`✅ Feed cache hit for ${cacheKey} (age: ${Math.round(age / 1000)} sec)`);
        return cached;
    } catch (error) {
        console.error('Error reading feed cache from IndexedDB:', error);
        return null;
    }
}

/**
 * Cache feed data
 */
export async function setCached(cacheKey, topic, articles) {
    try {
        const now = Date.now();

        const cacheData = {
            cacheKey,
            topic,
            articles,
            timestamp: now,
            articleCount: articles.length
        };

        await db.put(STORE_NAME, cacheData);
        console.log(`💾 Cached feed for ${topic} (${articles.length} articles)`);

        // Cleanup old entries
        await cleanup();
    } catch (error) {
        console.error('Error setting feed cache in IndexedDB:', error);
    }
}

/**
 * Invalidate cache for a specific topic
 */
export async function invalidate(topic) {
    try {
        await db.deleteByIndex(STORE_NAME, 'topic', topic);
        console.log(`🗑️ Invalidated feed cache for topic: ${topic}`);
    } catch (error) {
        console.error('Error invalidating feed cache:', error);
    }
}

/**
 * Clean up expired feed cache entries
 */
export async function cleanup() {
    try {
        const all = await db.getAll(STORE_NAME);
        const now = Date.now();
        let removed = 0;

        for (const item of all) {
            const age = now - item.timestamp;
            if (age > DEFAULT_TTL) {
                await db.delete(STORE_NAME, item.cacheKey);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} expired feed cache entries`);
        }
    } catch (error) {
        console.error('Error cleaning up feed cache:', error);
    }
}

/**
 * Clear all feed cache
 */
export async function clearAll() {
    try {
        await db.clear(STORE_NAME);
        console.log('🗑️ Cleared all feed cache entries');
    } catch (error) {
        console.error('Error clearing feed cache:', error);
    }
}

/**
 * Get feed cache statistics
 */
export async function getStats() {
    try {
        const all = await db.getAll(STORE_NAME);

        const stats = {
            totalCached: all.length,
            byTopic: {},
            totalArticles: 0,
            oldestEntry: null,
            newestEntry: null
        };

        all.forEach((item) => {
            const topic = item.topic || 'unknown';
            stats.byTopic[topic] = (stats.byTopic[topic] || 0) + 1;
            stats.totalArticles += item.articleCount || 0;

            if (!stats.oldestEntry || item.timestamp < stats.oldestEntry) {
                stats.oldestEntry = item.timestamp;
            }

            if (!stats.newestEntry || item.timestamp > stats.newestEntry) {
                stats.newestEntry = item.timestamp;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting feed cache stats:', error);
        return { totalCached: 0, byTopic: {}, totalArticles: 0 };
    }
}
