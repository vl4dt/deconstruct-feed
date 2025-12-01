console.log('NewsLens AI Background Service Worker Started');

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
        '16': '../../icons/attention_16.png',
        '48': '../../icons/attention_48.png',
        '128': '../../icons/attention_128.png'
    } : {
        '16': '../../icons/logo_16.png',
        '48': '../../icons/logo_48.png',
        '128': '../../icons/logo_128.png'
    };
    chrome.action.setIcon({ path });
}

// Alarm to periodically check inactivity
chrome.alarms.create('checkInactivity', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'checkInactivity') return;
    const [lastUsed, days] = await Promise.all([getLastUsed(), getInactivityDays()]);
    const idleMs = Date.now() - lastUsed;
    const thresholdMs = days * 24 * 60 * 60 * 1000;
    const shouldShowAttention = idleMs > thresholdMs;
    setIcon(shouldShowAttention);
});

// Update timestamp on extension click
chrome.action.onClicked.addListener(() => {
    updateLastUsed();
});

// Listen for messages from popup/options to reset usage (e.g., when user interacts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'resetUsage') {
        updateLastUsed();
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
