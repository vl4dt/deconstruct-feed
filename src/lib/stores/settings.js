import { writable } from 'svelte/store';
import { getSharedWorkerBridge, isSharedWorkerConnected } from '../sharedWorkerBridge.js';

function createSettingsStore() {
    const { subscribe, set, update } = writable({
        autoSummarize: true,
        autoBias: false,
        preloadScript: false,
        preloadPodcast: false,
        preloadDeepDive: false,
        autoTranslateAI: false,
        trendingKeywords: [],
        targetLanguage: 'en',
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
        geminiModel: 'gemini-1.5-flash',
        // Custom Prompts (Pro Feature)
        customPrompts: {
            summarize: {
                system: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
                user: 'Summarize this news article in Markdown format:\n\n{content}'
            },
            script: {
                system: 'You are a creative scriptwriter for a tech news YouTube channel.',
                user: 'Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n{articles}'
            },
            podcast: {
                system: 'You are a creative podcast producer writing a script for two engaging hosts.',
                user: 'Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n{articles}'
            },
            deepDive: {
                system: 'You are an expert news analyst.',
                user: 'Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n{articles}'
            },
            bias: {
                system: 'You are an objective media analyst.',
                user: 'Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n{content}'
            }
        }
    });

    // Shared worker integration
    let workerBridge = null;
    let suppressBroadcast = false; // Flag to prevent echo

    // Try to initialize shared worker
    const initSharedWorker = async () => {
        try {
            workerBridge = getSharedWorkerBridge();
            if (!workerBridge.connected) {
                await workerBridge.init();
            }

            // Listen for settings updates from other tabs
            workerBridge.on('STATE_UPDATE', (data) => {
                if (!suppressBroadcast) {
                    suppressBroadcast = true;
                    set(data);
                    suppressBroadcast = false;
                }
            }, 'settings');

            console.log('✅ Settings store connected to SharedWorker');
        } catch (error) {
            console.warn('SharedWorker not available for settings, falling back to local-only mode:', error);
            workerBridge = null;
        }
    };

    // Helper to broadcast state changes
    const broadcastState = (state) => {
        if (!suppressBroadcast && workerBridge && workerBridge.connected) {
            workerBridge.broadcastStateUpdate('settings', state);
        }
    };

    return {
        subscribe,
        init: async () => {
            // Initialize shared worker
            await initSharedWorker();

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
                    targetLanguage: 'en',
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
                    customPrompts: {
                        summarize: {
                            system: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
                            user: 'Summarize this news article in Markdown format:\n\n{content}'
                        },
                        script: {
                            system: 'You are a creative scriptwriter for a tech news YouTube channel.',
                            user: 'Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n{articles}'
                        },
                        podcast: {
                            system: 'You are a creative podcast producer writing a script for two engaging hosts.',
                            user: 'Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n{articles}'
                        },
                        deepDive: {
                            system: 'You are an expert news analyst.',
                            user: 'Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n{articles}'
                        },
                        bias: {
                            system: 'You are an objective media analyst.',
                            user: 'Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n{content}'
                        }
                    },
                    ...result.userSettings
                });

                // Broadcast initial state to other tabs
                broadcastState(result.userSettings);
            } else {
                // No saved settings, broadcast defaults
                const defaults = {
                    autoSummarize: true,
                    autoBias: false,
                    preloadScript: false,
                    preloadPodcast: false,
                    preloadDeepDive: false,
                    autoTranslateAI: false,
                    trendingKeywords: [],
                    targetLanguage: 'en',
                    aiProvider: 'chrome',
                    localAIUrl: 'http://localhost:11434/v1/chat/completions',
                    localAIModel: 'llama3',
                    openaiKey: '',
                    openaiModel: 'gpt-4o-mini',
                    anthropicKey: '',
                    anthropicModel: 'claude-3-5-sonnet-latest',
                    geminiKey: '',
                    geminiModel: 'gemini-1.5-flash',
                };
                broadcastState(defaults);
            }
        },
        toggle: async (setting) => {
            update(s => {
                const newSettings = { ...s, [setting]: !s[setting] };
                chrome.storage.local.set({ userSettings: newSettings });
                broadcastState(newSettings);
                return newSettings;
            });
        },
        set: async (key, value) => {
            update(s => {
                const newSettings = { ...s, [key]: value };
                chrome.storage.local.set({ userSettings: newSettings });
                broadcastState(newSettings);
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
                    broadcastState(newSettings);
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
                broadcastState(newSettings);
                return newSettings;
            });
        },
        setPrompt: async (type, field, value) => {
            update(s => {
                const newSettings = {
                    ...s,
                    customPrompts: {
                        ...s.customPrompts,
                        [type]: {
                            ...s.customPrompts[type],
                            [field]: value
                        }
                    }
                };
                chrome.storage.local.set({ userSettings: newSettings });
                broadcastState(newSettings);
                return newSettings;
            });
        },
        resetPrompt: async (type) => {
            const defaults = {
                summarize: {
                    system: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
                    user: 'Summarize this news article in Markdown format:\n\n{content}'
                },
                script: {
                    system: 'You are a creative scriptwriter for a tech news YouTube channel.',
                    user: 'Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n{articles}'
                },
                podcast: {
                    system: 'You are a creative podcast producer writing a script for two engaging hosts.',
                    user: 'Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n{articles}'
                },
                deepDive: {
                    system: 'You are an expert news analyst.',
                    user: 'Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n{articles}'
                },
                bias: {
                    system: 'You are an objective media analyst.',
                    user: 'Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n{content}'
                }
            };
            update(s => {
                const newSettings = {
                    ...s,
                    customPrompts: {
                        ...s.customPrompts,
                        [type]: defaults[type]
                    }
                };
                chrome.storage.local.set({ userSettings: newSettings });
                broadcastState(newSettings);
                return newSettings;
            });
        },
        resetAllPrompts: async () => {
            const defaults = {
                summarize: {
                    system: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
                    user: 'Summarize this news article in Markdown format:\n\n{content}'
                },
                script: {
                    system: 'You are a creative scriptwriter for a tech news YouTube channel.',
                    user: 'Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n{articles}'
                },
                podcast: {
                    system: 'You are a creative podcast producer writing a script for two engaging hosts.',
                    user: 'Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n{articles}'
                },
                deepDive: {
                    system: 'You are an expert news analyst.',
                    user: 'Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n{articles}'
                },
                bias: {
                    system: 'You are an objective media analyst.',
                    user: 'Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n{content}'
                }
            };
            update(s => {
                const newSettings = { ...s, customPrompts: defaults };
                chrome.storage.local.set({ userSettings: newSettings });
                broadcastState(newSettings);
                return newSettings;
            });
        }
    };
}

export const settings = createSettingsStore();
