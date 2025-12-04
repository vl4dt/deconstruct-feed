import { cacheFirst, networkFirstWithCache, cleanupCache } from './cacheStrategies.js';
import { fetchNewsForTopics } from '../lib/news/newsEngine.js';
import { sourceService } from '../lib/news/sourceService.js';

console.log('NewsLens AI Background Service Worker Started');

// ==================== CACHE CONFIGURATION ====================
// Cache version - increment when cache structure changes
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `newslens-static-${CACHE_VERSION}`;
const FEED_CACHE = `newslens-feeds-${CACHE_VERSION}`;
const ARTICLE_CACHE = `newslens-articles-${CACHE_VERSION}`;
const IMAGE_CACHE = `newslens-images-${CACHE_VERSION}`;

// All current cache names
const CURRENT_CACHES = [
    STATIC_CACHE,
    FEED_CACHE,
    ARTICLE_CACHE,
    IMAGE_CACHE
];

// Static assets are local to the extension and don't need caching
const STATIC_ASSETS = [];

// Cache size limits
const CACHE_LIMITS = {
    feeds: 50,
    articles: 100,
    images: 200
};


// ==================== INACTIVITY TRACKING ====================
// Default inactivity threshold in days (can be overridden via options page)
const DEFAULT_INACTIVITY_DAYS = 7;

// Keys for storage
const LAST_USED_KEY = 'lastUsed';
const INACTIVITY_DAYS_KEY = 'inactivityDays';

// Helper to get stored timestamp
function getLastUsed() {
    return new Promise((resolve) => {
        chrome.storage.local.get([LAST_USED_KEY], (result) => {
            resolve(result[LAST_USED_KEY] || Date.now());
        });
    });
}

// Helper to set timestamp to now
function updateLastUsed() {
    const now = Date.now();
    chrome.storage.local.set({ [LAST_USED_KEY]: now });
    // Ensure default icon is shown after activity
    setIcon(false);
}

// Retrieve inactivity threshold (days)
function getInactivityDays() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([INACTIVITY_DAYS_KEY], (result) => {
            resolve(result[INACTIVITY_DAYS_KEY] || DEFAULT_INACTIVITY_DAYS);
        });
    });
}

// Set the extension icon based on attention flag
function setIcon(isAttention) {
    const path = isAttention ? {
        '16': '/icons/attention_16.png',
        '48': '/icons/attention_48.png',
        '128': '/icons/attention_128.png'
    } : {
        '16': '/icons/logo_16.png',
        '48': '/icons/logo_48.png',
        '128': '/icons/logo_128.png'
    };
    chrome.action.setIcon({ path });
}

// Alarm to periodically check inactivity and cleanup cache
chrome.alarms.create('checkInactivity', { periodInMinutes: 60 });
chrome.alarms.create('cleanupCache', { periodInMinutes: 60 });
chrome.alarms.create('backgroundSync', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkInactivity') {
        const [lastUsed, days] = await Promise.all([getLastUsed(), getInactivityDays()]);
        const idleMs = Date.now() - lastUsed;
        const thresholdMs = days * 24 * 60 * 60 * 1000;
        const shouldShowAttention = idleMs > thresholdMs;
        setIcon(shouldShowAttention);
    } else if (alarm.name === 'cleanupCache') {
        console.log('Running periodic cache cleanup...');
        await cleanupCache(FEED_CACHE, CACHE_LIMITS.feeds);
        await cleanupCache(ARTICLE_CACHE, CACHE_LIMITS.articles);
        await cleanupCache(IMAGE_CACHE, CACHE_LIMITS.images);
    } else if (alarm.name === 'backgroundSync') {
        console.log('🔄 Background sync triggered');
        await syncNewsInBackground();
    }
});

// Update timestamp on extension click
chrome.action.onClicked.addListener(() => {
    updateLastUsed();
});

// Listen for messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'resetUsage') {
        updateLastUsed();
        sendResponse({ status: 'ok' });
        return true;
    }

    if (message.type === 'networkRestored') {
        console.log('📡 Network restored - triggering background refresh');
        // Optionally trigger feed refresh here
        sendResponse({ status: 'ok' });
        return true;
    }
});

// Initialize timestamp on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('NewsLens AI Extension Installed');
    updateLastUsed();

    // Create context menu item for selected text
    chrome.contextMenus.create({
        id: 'searchNewsLensAI',
        title: 'Search with NewsLens AI',
        contexts: ['selection']
    });
    console.log('Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'searchNewsLensAI') {
        const selectedText = info.selectionText;
        console.log('Context menu search triggered for:', selectedText);

        // Open side panel first to preserve user gesture
        chrome.sidePanel.open({ windowId: tab.windowId })
            .then(() => {
                console.log('Side panel opened successfully');
                return chrome.storage.session.set({
                    contextMenuQuery: selectedText,
                    timestamp: Date.now()
                });
            })
            .then(() => {
                console.log('Query stored in session:', selectedText);
            })
            .catch((error) => {
                console.error('Failed to open side panel:', error);
            });
    }
});

// ==================== BACKGROUND SYNC ====================

/**
 * Setup offscreen document for RSS parsing in background
 */
async function setupOffscreenDocument() {
    const offscreenUrl = 'src/offscreen/offscreen.html';
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(offscreenUrl)]
    });

    if (existingContexts.length > 0) {
        // Offscreen document already exists
        return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
        url: offscreenUrl,
        reasons: ['DOM_PARSER'],
        justification: 'Parse RSS/XML feeds in background'
    });
    console.log('📄 Offscreen document created for background parsing');
}

/**
 * Sync news in background
 */
async function syncNewsInBackground() {
    try {
        // Setup offscreen document if needed
        await setupOffscreenDocument();

        // Get user's topics
        const topics = await sourceService.getTopics();

        if (!topics || topics.length === 0) {
            console.log('No topics configured, skipping background sync');
            return;
        }

        console.log(`Syncing ${topics.length} topics in background...`);

        // Fetch news (will use offscreen document for parsing)
        const articles = await fetchNewsForTopics(topics, true);

        console.log(`✅ Background sync complete: ${articles.length} articles cached`);
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

// ==================== SERVICE WORKER CACHING ====================

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName.startsWith('newslens-') &&
                                !CURRENT_CACHES.includes(cacheName);
                        })
                        .map(cacheName => {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('✅ Old caches cleaned up');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event - Intercept network requests
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only cache HTTP/HTTPS requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Determine caching strategy based on resource type
    if (isRSSFeed(url)) {
        event.respondWith(networkFirstWithCache(request, FEED_CACHE, 5000));
    } else if (isArticleContent(url)) {
        event.respondWith(networkFirstWithCache(request, ARTICLE_CACHE, 3000));
    } else if (isImage(url)) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
    } else if (request.mode === 'navigate') {
        // Fallback for navigation requests
        event.respondWith(
            fetch(request).catch(() => fetch('/offlineFallback.html'))
        );
    }
});



/**
 * Helper: Check if URL is an RSS feed
 */
function isRSSFeed(url) {
    const hostname = url.hostname;
    const path = url.pathname;

    return hostname.includes('feeds.') ||
        hostname.includes('rss.') ||
        path.includes('/feed') ||
        path.includes('/rss') ||
        path.endsWith('.xml') ||
        path.endsWith('.rss');
}

/**
 * Helper: Check if URL is article content
 */
function isArticleContent(url) {
    const hostname = url.hostname;

    const newsDomains = [
        'techcrunch.com',
        'theverge.com',
        'arstechnica.com',
        'wired.com',
        'engadget.com',
        'cnet.com',
        'zdnet.com',
        'reuters.com',
        'apnews.com'
    ];

    return newsDomains.some(domain => hostname.includes(domain));
}

/**
 * Helper: Check if URL is an image
 */
function isImage(url) {
    const path = url.pathname;
    return path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.png') ||
        path.endsWith('.gif') ||
        path.endsWith('.webp') ||
        path.endsWith('.svg');
}
