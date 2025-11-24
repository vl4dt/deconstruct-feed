import { writable } from 'svelte/store';

function createThemeStore() {
    const { subscribe, set, update } = writable('light');

    return {
        subscribe,
        init: async () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    const stored = await chrome.storage.local.get('theme');
                    if (stored && typeof stored.theme === 'string') {
                        set(stored.theme);
                        document.documentElement.setAttribute('data-theme', stored.theme);
                        return;
                    }
                }
            } catch (e) {
                console.error('Failed to load theme from storage:', e);
            }

            // Fallback to system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                set('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        },
        toggle: async () => {
            update(current => {
                const newTheme = current === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                try {
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ theme: newTheme });
                    }
                } catch (e) {
                    console.error('Failed to save theme:', e);
                }
                return newTheme;
            });
        },
        setTheme: async (theme) => {
            set(theme);
            document.documentElement.setAttribute('data-theme', theme);
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    await chrome.storage.local.set({ theme });
                }
            } catch (e) {
                console.error('Failed to save theme:', e);
            }
        }
    };
}

export const theme = createThemeStore();
