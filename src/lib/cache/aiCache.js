import * as aiCacheDB from '../db/aiCacheDB.js';

const CACHE_VERSION = 1;
const MIGRATION_KEY = 'aiCache_migrated_to_indexeddb';

/**
 * Migrate data from chrome.storage to IndexedDB (one-time)
 */
async function migrateIfNeeded() {
    try {
        const result = await chrome.storage.local.get(MIGRATION_KEY);
        if (result[MIGRATION_KEY]) {
            return; // Already migrated
        }

        console.log('🔄 Migrating AI cache from chrome.storage to IndexedDB...');

        // Get all AI cache data from chrome.storage
        const allData = await chrome.storage.local.get(null);
        const aiCacheKeys = Object.keys(allData).filter(key => key.startsWith('ai_cache_'));

        let migrated = 0;
        for (const key of aiCacheKeys) {
            const cached = allData[key];
            if (cached && cached.contentHash && cached.analysisType && cached.result) {
                await aiCacheDB.setCached(cached.contentHash, cached.analysisType, cached.result);
                migrated++;
            }
        }

        // Mark as migrated
        await chrome.storage.local.set({ [MIGRATION_KEY]: true });

        // Remove old cache data
        if (aiCacheKeys.length > 0) {
            await chrome.storage.local.remove(aiCacheKeys);
        }

        console.log(`✅ Migrated ${migrated} AI cache entries to IndexedDB`);
    } catch (error) {
        console.error('Error migrating AI cache:', error);
    }
}

/**
 * Get cached AI result if valid
 * @param {string} contentHash - Hash of input content
 * @param {string} analysisType - Type of analysis (summary, bias, script, deepdive, podcast)
 * @returns {Promise<string|null>} Cached result or null
 */
export async function getCachedAIResult(contentHash, analysisType) {
    await migrateIfNeeded();
    return await aiCacheDB.getCached(contentHash, analysisType);
}

/**
 * Cache AI result
 * @param {string} contentHash - Hash of input content
 * @param {string} analysisType - Type of analysis
 * @param {string} result - AI-generated result
 * @returns {Promise<void>}
 */
export async function setCachedAIResult(contentHash, analysisType, result) {
    await migrateIfNeeded();
    await aiCacheDB.setCached(contentHash, analysisType, result);
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
    await migrateIfNeeded();
    await aiCacheDB.cleanup();
}

/**
 * Clear all AI cache
 * @returns {Promise<void>}
 */
export async function clearAllAICache() {
    await migrateIfNeeded();
    await aiCacheDB.clearAll();
}

/**
 * Get AI cache statistics
 * @returns {Promise<Object>} Cache stats
 */
export async function getAICacheStats() {
    await migrateIfNeeded();
    return await aiCacheDB.getStats();
}
