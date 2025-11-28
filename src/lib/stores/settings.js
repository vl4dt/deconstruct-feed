import { writable } from 'svelte/store';

function createSettingsStore() {
    const { subscribe, set, update } = writable({
        autoSummarize: true,
        autoBias: false,
        preloadScript: false,
        preloadPodcast: false,
        preloadDeepDive: false,
        autoTranslateAI: false,
        trendingKeywords: [],
        // AI Provider Settings
        aiProvider: 'chrome', // chrome, gemini, local, openai, anthropic
        // Local AI
        localAIUrl: 'http://localhost:11434/v1/chat/completions',
        localAIModel: 'llama3',
        // OpenAI
        openaiKey: '',
        openaiModel: 'gpt-4o-mini',
        // Anthropic
        anthropicKey: '',
        anthropicModel: 'claude-3-5-sonnet-latest',
        // Gemini
        geminiKey: '',
        geminiModel: 'gemini-1.5-flash'
    });

    return {
        subscribe,
        init: async () => {
            const result = await chrome.storage.local.get('userSettings');
            if (result.userSettings) {
                // Merge saved settings with defaults to ensure all properties exist
                set({
                    autoSummarize: true,
                    autoBias: false,
                    preloadScript: false,
                    preloadPodcast: false,
                    preloadDeepDive: false,
                    autoTranslateAI: false,
                    trendingKeywords: [],
                    // AI Provider Settings
                    aiProvider: 'chrome',
                    localAIUrl: 'http://localhost:11434/v1/chat/completions',
                    localAIModel: 'llama3',
                    openaiKey: '',
                    openaiModel: 'gpt-4o-mini',
                    anthropicKey: '',
                    anthropicModel: 'claude-3-5-sonnet-latest',
                    geminiKey: '',
                    geminiModel: 'gemini-1.5-flash',
                    ...result.userSettings
                });
            }
        },
        toggle: async (setting) => {
            update(s => {
                const newSettings = { ...s, [setting]: !s[setting] };
                chrome.storage.local.set({ userSettings: newSettings });
                return newSettings;
            });
        },
        set: async (key, value) => {
            update(s => {
                const newSettings = { ...s, [key]: value };
                chrome.storage.local.set({ userSettings: newSettings });
                return newSettings;
            });
        },
        addTrendingKeyword: async (keyword) => {
            update(s => {
                // Ensure trendingKeywords array exists
                const keywords = s.trendingKeywords || [];
                if (!keywords.includes(keyword)) {
                    const newSettings = { ...s, trendingKeywords: [...keywords, keyword] };
                    chrome.storage.local.set({ userSettings: newSettings });
                    return newSettings;
                }
                return s;
            });
        },
        removeTrendingKeyword: async (keyword) => {
            update(s => {
                // Ensure trendingKeywords array exists
                const keywords = s.trendingKeywords || [];
                const newSettings = { ...s, trendingKeywords: keywords.filter(k => k !== keyword) };
                chrome.storage.local.set({ userSettings: newSettings });
                return newSettings;
            });
        }
    };
}

export const settings = createSettingsStore();
