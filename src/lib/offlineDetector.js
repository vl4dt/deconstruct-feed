/**
 * Offline Detector Store
 * 
 * Reactive store for tracking online/offline status.
 * Listens to browser online/offline events and provides reactive updates.
 */

import { writable } from 'svelte/store';

/**
 * Create online status store
 * Tracks whether the browser is online or offline
 */
function createOnlineStore() {
    // Initialize with current online status
    const { subscribe, set } = writable(navigator.onLine);

    // Listen for online event
    const handleOnline = () => {
        console.log('📡 Network connection restored');
        set(true);

        // Optionally trigger background refresh
        notifyNetworkRestored();
    };

    // Listen for offline event
    const handleOffline = () => {
        console.log('📡 Network connection lost');
        set(false);
    };

    // Add event listeners
    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }

    return {
        subscribe,
        /**
         * Check if currently online
         * @returns {boolean}
         */
        isOnline: () => navigator.onLine,

        /**
         * Check if currently offline
         * @returns {boolean}
         */
        isOffline: () => !navigator.onLine,

        /**
         * Manually trigger online status check
         */
        checkStatus: () => {
            set(navigator.onLine);
        }
    };
}

/**
 * Notify extension that network has been restored
 * This can trigger background feed refresh
 */
function notifyNetworkRestored() {
    try {
        // Send message to background service worker
        chrome.runtime.sendMessage({
            type: 'networkRestored',
            timestamp: Date.now()
        }).catch(err => {
            // Service worker might not be running, that's ok
            console.debug('Could not notify service worker:', err);
        });
    } catch (error) {
        console.debug('Runtime messaging not available:', error);
    }
}

/**
 * Store for tracking last online time
 * Useful for showing "Last updated X minutes ago" messages
 */
function createLastOnlineStore() {
    const { subscribe, set, update } = writable(Date.now());

    // Update when going offline
    if (typeof window !== 'undefined') {
        window.addEventListener('offline', () => {
            update(() => Date.now());
        });

        window.addEventListener('online', () => {
            update(() => Date.now());
        });
    }

    return {
        subscribe,
        /**
         * Get time since last online (in milliseconds)
         * @returns {number}
         */
        getTimeSinceOnline: () => {
            let lastTime;
            subscribe(val => lastTime = val)();
            return Date.now() - lastTime;
        },

        /**
         * Get formatted time since last online
         * @returns {string} e.g., "5 minutes ago"
         */
        getFormattedTimeSinceOnline: () => {
            let lastTime;
            subscribe(val => lastTime = val)();
            const ms = Date.now() - lastTime;
            const minutes = Math.floor(ms / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
            if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
            if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
            return 'just now';
        }
    };
}

// Export store instances
export const onlineStatus = createOnlineStore();
export const lastOnlineTime = createLastOnlineStore();

/**
 * Helper function to run code only when online
 * @param {Function} callback - Function to run when online
 * @returns {Promise<void>}
 */
export async function runWhenOnline(callback) {
    if (navigator.onLine) {
        return callback();
    } else {
        console.warn('Attempted to run network operation while offline');
        return Promise.reject(new Error('Network unavailable'));
    }
}

/**
 * Helper to check if a fetch failed due to network issues
 * @param {Error} error - Error from fetch
 * @returns {boolean}
 */
export function isNetworkError(error) {
    return error.message.includes('Failed to fetch') ||
        error.message.includes('Network request failed') ||
        error.message.includes('timeout') ||
        error.message.includes('NetworkError');
}
