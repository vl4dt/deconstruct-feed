/**
 * Cache Strategy Utilities for Service Worker
 * 
 * Provides reusable cache strategies for different resource types.
 * Strategies: cache-first, network-first, stale-while-revalidate
 */

/**
 * Cache-First Strategy
 * Try cache first, fetch from network if cache miss, then cache the result.
 * Best for: Static assets that rarely change (HTML, CSS, JS, icons, images)
 * 
 * @param {Request} request - The request to handle
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>}
 */
export async function cacheFirst(request, cacheName) {
    try {
        // Check cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Cache miss - fetch from network
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('Cache-first strategy failed:', error);

        // Try to return cached version even if fetch fails
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline response
        return new Response('Offline - Resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Network-First Strategy with Cache Fallback
 * Try network first with timeout, fall back to cache if network fails or is slow.
 * Best for: RSS feeds, API calls that should be fresh but have acceptable cached versions
 * 
 * @param {Request} request - The request to handle  
 * @param {string} cacheName - Name of the cache to use
 * @param {number} timeout - Network timeout in milliseconds (default: 5000)
 * @returns {Promise<Response>}
 */
export async function networkFirstWithCache(request, cacheName, timeout = 5000) {
    try {
        // Try network with timeout
        const networkResponse = await fetchWithTimeout(request, timeout);

        // Cache successful responses
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('Network request failed, trying cache:', error.message);

        // Network failed - try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('Serving from cache:', request.url);
            return cachedResponse;
        }

        // No cache available
        return new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Stale-While-Revalidate Strategy
 * Return cached version immediately, fetch fresh version in background.
 * Best for: Resources that should be fast but updated when possible
 * 
 * @param {Request} request - The request to handle
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>}
 */
export async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);

    // Start fetching fresh version (don't await)
    const fetchPromise = fetch(request).then(response => {
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(err => {
        console.warn('Background fetch failed:', err);
        return null;
    });

    // Try to return cached version immediately
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // No cache - wait for network
    return fetchPromise || new Response('Offline', { status: 503 });
}

/**
 * Fetch with timeout
 * Fetches a request with a timeout, throwing if timeout exceeded
 * 
 * @param {Request} request - The request to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
export function fetchWithTimeout(request, timeout) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Network timeout after ${timeout}ms`)), timeout)
        )
    ]);
}

/**
 * Clean up old cache entries (LRU strategy)
 * Removes oldest entries when cache exceeds max items
 * 
 * @param {string} cacheName - Name of the cache to clean
 * @param {number} maxItems - Maximum number of items to keep
 * @returns {Promise<number>} Number of items deleted
 */
export async function cleanupCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length <= maxItems) {
        return 0;
    }

    const toDelete = keys.length - maxItems;
    const deletePromises = [];

    // Delete oldest entries (first items in the list)
    for (let i = 0; i < toDelete; i++) {
        deletePromises.push(cache.delete(keys[i]));
    }

    await Promise.all(deletePromises);
    console.log(`Cleaned up ${toDelete} old cache entries from ${cacheName}`);

    return toDelete;
}

/**
 * Get cache statistics
 * Returns information about cache usage
 * 
 * @param {string} cacheName - Name of the cache to analyze
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats(cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        return {
            name: cacheName,
            itemCount: keys.length,
            urls: keys.map(req => req.url)
        };
    } catch (error) {
        console.error('Failed to get cache stats:', error);
        return {
            name: cacheName,
            itemCount: 0,
            urls: [],
            error: error.message
        };
    }
}

/**
 * Clear specific cache
 * 
 * @param {string} cacheName - Name of the cache to clear
 * @returns {Promise<boolean>} True if cache was deleted
 */
export async function clearCache(cacheName) {
    return await caches.delete(cacheName);
}

/**
 * Clear all NewsLens caches
 * 
 * @returns {Promise<number>} Number of caches deleted
 */
export async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const newslensCaches = cacheNames.filter(name => name.startsWith('newslens-'));

    const deletePromises = newslensCaches.map(name => caches.delete(name));
    await Promise.all(deletePromises);

    console.log(`Cleared ${newslensCaches.length} NewsLens caches`);
    return newslensCaches.length;
}
