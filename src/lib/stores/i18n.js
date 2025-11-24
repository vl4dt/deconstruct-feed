import { writable, derived } from 'svelte/store';
import { languages } from '../i18n/index';

// Load initial locale from storage or default to 'en'
const storedLocale = localStorage.getItem('news_curator_locale') || 'en';

export const locale = writable(storedLocale);

// Subscribe to locale changes to persist them
locale.subscribe(value => {
    localStorage.setItem('news_curator_locale', value);
});

export const t = derived(locale, ($locale) => {
    return (key, vars = {}) => {
        // Fallback to English if translation missing
        const translations = languages[$locale]?.translations || languages['en'].translations;
        let text = translations[key] || key;

        // Replace variables
        Object.keys(vars).forEach(k => {
            const regex = new RegExp(`{{${k}}}`, 'g');
            text = text.replace(regex, vars[k]);
        });

        return text;
    };
});

export const availableLanguages = Object.keys(languages).map(key => ({
    code: key,
    label: languages[key].label
}));
