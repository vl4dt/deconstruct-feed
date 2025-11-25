import { writable } from 'svelte/store';

function createSettingsStore() {
    const { subscribe, set, update } = writable({
        autoSummarize: true,
        autoBias: false,
        preloadScript: false,
        preloadPodcast: false,
        preloadDeepDive: false,
        autoTranslateAI: false,
        trendingKeywords: []
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
        },
        addTrendingKeyword: async (keyword) => {
            update(s => {
                if (!s.trendingKeywords.includes(keyword)) {
                    const newSettings = { ...s, trendingKeywords: [...s.trendingKeywords, keyword] };
                    chrome.storage.local.set({ userSettings: newSettings });
                    return newSettings;
                }
                return s;
            });
        },
        removeTrendingKeyword: async (keyword) => {
            update(s => {
                const newSettings = { ...s, trendingKeywords: s.trendingKeywords.filter(k => k !== keyword) };
                chrome.storage.local.set({ userSettings: newSettings });
                return newSettings;
            });
        }
    };
}

export const settings = createSettingsStore();
