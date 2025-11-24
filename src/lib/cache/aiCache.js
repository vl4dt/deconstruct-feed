const CACHE_VERSION = 1;
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHED_RESULTS = 50;

/**
 * Get cached AI result if valid
 * @param {string} contentHash - Hash of input content
 * @param {string} analysisType - Type of analysis (summary, bias, script, deepdive)
 * @returns {Promise<string|null>} Cached result or null
 */
export async function getCachedAIResult(contentHash, analysisType) {
    try {
        const cacheKey = `ai_cache_${analysisType}_${contentHash}`;
        const result = await chrome.storage.local.get(cacheKey);

        if (!result[cacheKey]) {
            return null;
        }

        const cached = result[cacheKey];

        // Validate version
        if (cached.version !== CACHE_VERSION) {
            console.log('AI cache version mismatch');
            return null;
        }

        // Check expiration
        const now = Date.now();
        const age = now - cached.createdAt;

        if (age > DEFAULT_TTL) {
            console.log(`AI cache expired for ${analysisType} (age: ${Math.round(age / (1000 * 60 * 60 * 24))} days)`);
            return null;
        }

        console.log(`✅ AI cache hit for ${analysisType} (age: ${Math.round(age / (1000 * 60))} min)`);

        // Update last accessed time
        cached.lastAccessedAt = now;
        await chrome.storage.local.set({ [cacheKey]: cached });

        return cached.result;
    } catch (error) {
        console.error('Error reading AI cache:', error);
        return null;
    }
}

/**
 * Cache AI result
 * @param {string} contentHash - Hash of input content
 * @param {string} analysisType - Type of analysis
 * @param {string} result - AI-generated result
 * @returns {Promise<void>}
 */
export async function setCachedAIResult(contentHash, analysisType, result) {
    try {
        const cacheKey = `ai_cache_${analysisType}_${contentHash}`;
        const now = Date.now();

        const cacheData = {
            version: CACHE_VERSION,
            result: result,
            contentHash: contentHash,
            analysisType: analysisType,
            createdAt: now,
            lastAccessedAt: now
        };

        await chrome.storage.local.set({ [cacheKey]: cacheData });
        console.log(`💾 Cached AI result for ${analysisType} (${result.length} chars)`);

        // Cleanup old entries
        await cleanupAICache();
    } catch (error) {
        console.error('Error setting AI cache:', error);
    }
}

/**
 * Hash content for cache key
 * @param {string} content - Content to hash
 * @returns {string} Hash string
 */
export function hashContent(content) {
    // Simple but effective hash function
    let hash = 0;
    const str = content.substring(0, 1000); // Use first 1000 chars for performance

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36) + '_' + str.length;
}

/**
 * Clean up old AI cache entries
 * @returns {Promise<void>}
 */
export async function cleanupAICache() {
    try {
        const allData = await chrome.storage.local.get(null);
        const aiCaches = Object.entries(allData)
            .filter(([key]) => key.startsWith('ai_cache_'))
            .map(([key, value]) => ({ key, ...value }));

        // If under limit, no cleanup needed
        if (aiCaches.length <= MAX_CACHED_RESULTS) {
            return;
        }

        // Sort by last accessed (LRU)
        aiCaches.sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));

        // Remove oldest entries
        const toRemove = aiCaches.slice(0, aiCaches.length - MAX_CACHED_RESULTS);
        const keysToRemove = toRemove.map(item => item.key);

        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log(`🧹 Cleaned up ${keysToRemove.length} old AI cache entries`);
        }
    } catch (error) {
        console.error('Error cleaning up AI cache:', error);
    }
}

/**
 * Clear all AI cache
 * @returns {Promise<void>}
 */
export async function clearAllAICache() {
    try {
        const allData = await chrome.storage.local.get(null);
        const aiCacheKeys = Object.keys(allData).filter(key => key.startsWith('ai_cache_'));

        if (aiCacheKeys.length > 0) {
            await chrome.storage.local.remove(aiCacheKeys);
            console.log(`🗑️ Cleared ${aiCacheKeys.length} AI cache entries`);
        }
    } catch (error) {
        console.error('Error clearing AI cache:', error);
    }
}

/**
 * Get AI cache statistics
 * @returns {Promise<Object>} Cache stats
 */
export async function getAICacheStats() {
    try {
        const allData = await chrome.storage.local.get(null);
        const aiCaches = Object.entries(allData).filter(([key]) => key.startsWith('ai_cache_'));

        const stats = {
            totalCached: aiCaches.length,
            byType: {},
            totalSize: 0,
            oldestEntry: null,
            newestEntry: null
        };

        aiCaches.forEach(([_, value]) => {
            const type = value.analysisType || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.totalSize += value.result?.length || 0;

            if (!stats.oldestEntry || value.createdAt < stats.oldestEntry) {
                stats.oldestEntry = value.createdAt;
            }

            if (!stats.newestEntry || value.createdAt > stats.newestEntry) {
                stats.newestEntry = value.createdAt;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting AI cache stats:', error);
        return { totalCached: 0, byType: {}, totalSize: 0 };
    }
}
