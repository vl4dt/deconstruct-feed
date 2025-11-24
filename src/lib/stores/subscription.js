import { writable } from 'svelte/store';

function createSubscriptionStore() {
    const { subscribe, set, update } = writable({
        isPro: false,
        loading: true
    });

    return {
        subscribe,
        init: async () => {
            const result = await chrome.storage.local.get(['isPro']);
            update(s => ({ ...s, isPro: !!result.isPro, loading: false }));
        },
        upgrade: async () => {
            await chrome.storage.local.set({ isPro: true });
            update(s => ({ ...s, isPro: true }));
        },
        downgrade: async () => {
            await chrome.storage.local.set({ isPro: false });
            update(s => ({ ...s, isPro: false }));
        }
    };
}

export const userSubscription = createSubscriptionStore();
