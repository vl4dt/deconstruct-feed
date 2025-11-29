import { vi } from 'vitest';

// Mock Chrome APIs globally
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys, callback) => {
                const result = {};
                if (callback) callback(result);
                return Promise.resolve(result);
            }),
            set: vi.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            remove: vi.fn((keys, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            clear: vi.fn((callback) => {
                if (callback) callback();
                return Promise.resolve();
            })
        },
        sync: {
            get: vi.fn((keys, callback) => {
                const result = {};
                if (callback) callback(result);
                return Promise.resolve(result);
            }),
            set: vi.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            })
        },
        session: {
            get: vi.fn((keys, callback) => {
                const result = {};
                if (callback) callback(result);
                return Promise.resolve(result);
            }),
            set: vi.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            remove: vi.fn((keys, callback) => {
                if (callback) callback();
                return Promise.resolve();
            })
        }
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn()
        },
        getURL: vi.fn((path) => `chrome-extension://test-id/${path}`)
    },
    tabs: {
        query: vi.fn(() => Promise.resolve([])),
        sendMessage: vi.fn(),
        create: vi.fn()
    },
    action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn()
    },
    alarms: {
        create: vi.fn(),
        onAlarm: {
            addListener: vi.fn()
        }
    },
    contextMenus: {
        create: vi.fn(),
        onClicked: {
            addListener: vi.fn()
        }
    }
};

// Mock LanguageModel API for Chrome AI
global.LanguageModel = {
    availability: vi.fn(() => Promise.resolve('available')),
    params: vi.fn(() => Promise.resolve({
        defaultTopK: 3,
        maxTopK: 8,
        defaultTemperature: 1.0
    })),
    create: vi.fn(() => Promise.resolve({
        prompt: vi.fn((text) => Promise.resolve(`Mocked AI response for: ${text}`)),
        destroy: vi.fn()
    }))
};

// Mock fetch globally for RSS feeds
global.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});
