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

        // Support nested keys (e.g. 'onboarding.welcome')
        const keys = key.split('.');
        let text = translations;

        for (const k of keys) {
            if (text && typeof text === 'object' && k in text) {
                text = text[k];
            } else {
                // Fallback to English for nested keys
                const enTranslations = languages['en'].translations;
                let enText = enTranslations;
                let foundInEn = true;

                for (const enK of keys) {
                    if (enText && typeof enText === 'object' && enK in enText) {
                        enText = enText[enK];
                    } else {
                        foundInEn = false;
                        break;
                    }
                }

                text = foundInEn ? enText : key;
                break;
            }
        }

        // If text is still an object (incomplete path) or not found, return key
        if (typeof text !== 'string') {
            text = key;
        }

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
