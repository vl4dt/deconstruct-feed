const CACHE_VERSION = 1;
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_ARTICLES_PER_FEED = 100;

/**
 * Get cached feed data if valid
 * @param {string} feedUrl - RSS feed URL
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<Array|null>} Cached articles or null if invalid/expired
 */
export async function getCachedFeed(feedUrl, ttl = DEFAULT_TTL) {
    try {
        const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
        const result = await chrome.storage.local.get(cacheKey);

        if (!result[cacheKey]) {
            return null;
        }

        const cached = result[cacheKey];

        // Validate version
        if (cached.version !== CACHE_VERSION) {
            console.log('Cache version mismatch, invalidating');
            await invalidateCache(feedUrl);
            return null;
        }

        // Check expiration
        const now = Date.now();
        const age = now - cached.fetchedAt;

        if (age > ttl) {
            console.log(`Cache expired for ${feedUrl} (age: ${Math.round(age / 1000)}s)`);
            return null;
        }

        console.log(`Cache hit for ${feedUrl} (age: ${Math.round(age / 1000)}s)`);

        // Update last accessed time
        cached.lastAccessedAt = now;
        await chrome.storage.local.set({ [cacheKey]: cached });

        return cached.articles;
    } catch (error) {
        console.error('Error reading feed cache:', error);
        return null;
    }
}

/**
 * Cache feed data
 * @param {string} feedUrl - RSS feed URL
 * @param {Array} articles - Articles to cache
 * @returns {Promise<void>}
 */
export async function setCachedFeed(feedUrl, articles) {
    try {
        const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
        const now = Date.now();

        // Limit articles
        const limitedArticles = articles.slice(0, MAX_ARTICLES_PER_FEED);

        const cacheData = {
            version: CACHE_VERSION,
            articles: limitedArticles,
            fetchedAt: now,
            lastAccessedAt: now,
            feedUrl: feedUrl
        };

        await chrome.storage.local.set({ [cacheKey]: cacheData });
        console.log(`Cached ${limitedArticles.length} articles for ${feedUrl}`);

        // Cleanup old cache entries after setting new one
        await cleanupExpiredCache();
    } catch (error) {
        console.error('Error setting feed cache:', error);
    }
}

/**
 * Invalidate cache for specific feed
 * @param {string} feedUrl - RSS feed URL to invalidate
 * @returns {Promise<void>}
 */
export async function invalidateCache(feedUrl) {
    try {
        const cacheKey = `feed_cache_${hashUrl(feedUrl)}`;
        await chrome.storage.local.remove(cacheKey);
        console.log(`Invalidated cache for ${feedUrl}`);
    } catch (error) {
        console.error('Error invalidating cache:', error);
    }
}

/**
 * Invalidate all feed caches
 * @returns {Promise<void>}
 */
export async function invalidateAllCaches() {
    try {
        const allData = await chrome.storage.local.get(null);
        const feedCacheKeys = Object.keys(allData).filter(key => key.startsWith('feed_cache_'));

        if (feedCacheKeys.length > 0) {
            await chrome.storage.local.remove(feedCacheKeys);
            console.log(`Invalidated ${feedCacheKeys.length} feed caches`);
        }
    } catch (error) {
        console.error('Error invalidating all caches:', error);
    }
}

/**
 * Clean up expired cache entries
 * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
 * @returns {Promise<void>}
 */
export async function cleanupExpiredCache(maxAge = 24 * 60 * 60 * 1000) {
    try {
        const allData = await chrome.storage.local.get(null);
        const now = Date.now();
        const keysToRemove = [];

        for (const [key, value] of Object.entries(allData)) {
            if (key.startsWith('feed_cache_')) {
                const age = now - (value.lastAccessedAt || value.fetchedAt || 0);

                if (age > maxAge) {
                    keysToRemove.push(key);
                }
            }
        }

        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
        }
    } catch (error) {
        console.error('Error cleaning up cache:', error);
    }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache stats
 */
export async function getCacheStats() {
    try {
        const allData = await chrome.storage.local.get(null);
        const feedCaches = Object.entries(allData).filter(([key]) => key.startsWith('feed_cache_'));

        const stats = {
            totalCaches: feedCaches.length,
            totalArticles: 0,
            oldestCache: null,
            newestCache: null
        };

        feedCaches.forEach(([_, value]) => {
            stats.totalArticles += value.articles?.length || 0;

            if (!stats.oldestCache || value.fetchedAt < stats.oldestCache) {
                stats.oldestCache = value.fetchedAt;
            }

            if (!stats.newestCache || value.fetchedAt > stats.newestCache) {
                stats.newestCache = value.fetchedAt;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return { totalCaches: 0, totalArticles: 0 };
    }
}

/**
 * Simple hash function for URLs
 * @param {string} url - URL to hash
 * @returns {string} Hash string
 */
function hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
