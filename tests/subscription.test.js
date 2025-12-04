import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { userSubscription } from '../src/lib/stores/subscription';

// Mock chrome.storage.local
const storageMock = (() => {
    let store = {};
    return {
        get: vi.fn((keys) => {
            if (Array.isArray(keys)) {
                return Promise.resolve(
                    keys.reduce((acc, key) => ({ ...acc, [key]: store[key] }), {})
                );
            }
            return Promise.resolve(store);
        }),
        set: vi.fn((items) => {
            store = { ...store, ...items };
            return Promise.resolve();
        }),
        remove: vi.fn((keys) => {
            if (Array.isArray(keys)) {
                keys.forEach(key => delete store[key]);
            } else {
                delete store[keys];
            }
            return Promise.resolve();
        }),
        clear: () => { store = {}; }
    };
})();

global.chrome = {
    storage: {
        local: storageMock
    }
};

describe('userSubscription Store', () => {
    beforeEach(async () => {
        storageMock.clear();
        vi.clearAllMocks();
        // Reset to default state
        await userSubscription.downgrade();
    });

    it('should initialize with default free tier values', async () => {
        await userSubscription.init();
        const state = get(userSubscription);
        expect(state.isPro).toBe(false);
        expect(state.usage.scriptsGenerated).toBe(0);
        expect(state.usage.deepDives).toBe(0);
    });

    it('should allow usage within limits for free users', async () => {
        await userSubscription.init();

        // Default limit is 3
        expect(userSubscription.checkLimit('script')).toBe(true);

        await userSubscription.incrementUsage('script');
        await userSubscription.incrementUsage('script');
        await userSubscription.incrementUsage('script');

        const state = get(userSubscription);
        expect(state.usage.scriptsGenerated).toBe(3);

        // Now at limit (3), checkLimit should return false
        expect(userSubscription.checkLimit('script')).toBe(false);
    });

    it('should always allow usage for Pro users', async () => {
        await userSubscription.upgrade(); // Use dev mode upgrade

        // Pro users should always be allowed
        expect(userSubscription.checkLimit('script')).toBe(true);
        expect(userSubscription.checkLimit('deepDive')).toBe(true);
    });

    it('should increment usage correctly', async () => {
        await userSubscription.init();

        await userSubscription.incrementUsage('script');
        let state = get(userSubscription);
        expect(state.usage.scriptsGenerated).toBe(1);

        await userSubscription.incrementUsage('deepDive');
        state = get(userSubscription);
        expect(state.usage.deepDives).toBe(1);
    });

    it('should return correct limits from getLimits()', () => {
        const limits = userSubscription.getLimits();
        expect(limits.scripts).toBe(3);
        expect(limits.deepDives).toBe(3);
    });
});
