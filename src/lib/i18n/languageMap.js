// Language code to full name mapping for AI translation service
export const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'pt': 'Portuguese'
};

// Get language name from code, fallback to English
export function getLanguageName(code) {
    return languageNames[code] || 'English';
}

// Get all supported language codes
export function getSupportedLanguages() {
    return Object.keys(languageNames);
}
