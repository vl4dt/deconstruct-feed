import { writable } from 'svelte/store';

function createSettingsStore() {
    const { subscribe, set, update } = writable({
        autoSummarize: true,
        autoBias: false,
        preloadScript: false,
        preloadPodcast: false,
        preloadDeepDive: false
    });

    return {
        subscribe,
        init: async () => {
            const result = await chrome.storage.local.get('userSettings');
            if (result.userSettings) {
                set(result.userSettings);
            }
        },
        toggle: async (setting) => {
            update(s => {
                const newSettings = { ...s, [setting]: !s[setting] };
                chrome.storage.local.set({ userSettings: newSettings });
                return newSettings;
            });
        }
    };
}

export const settings = createSettingsStore();
