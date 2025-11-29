import { describe, it, expect } from 'vitest';
import { getLanguageName, getSupportedLanguages, languageNames } from '../../../src/lib/i18n/languageMap';

describe('languageMap', () => {
    describe('languageNames', () => {
        it('should contain expected languages', () => {
            expect(languageNames).toHaveProperty('en');
            expect(languageNames).toHaveProperty('es');
            expect(languageNames).toHaveProperty('fr');
            expect(languageNames).toHaveProperty('de');
            expect(languageNames).toHaveProperty('pt');
        });

        it('should have correct language names', () => {
            expect(languageNames.en).toBe('English');
            expect(languageNames.es).toBe('Spanish');
            expect(languageNames.fr).toBe('French');
            expect(languageNames.de).toBe('German');
            expect(languageNames.pt).toBe('Portuguese');
        });
    });

    describe('getLanguageName', () => {
        it('should return correct language name for valid code', () => {
            expect(getLanguageName('en')).toBe('English');
            expect(getLanguageName('es')).toBe('Spanish');
            expect(getLanguageName('fr')).toBe('French');
        });

        it('should return English for unknown code', () => {
            expect(getLanguageName('unknown')).toBe('English');
            expect(getLanguageName('xx')).toBe('English');
            expect(getLanguageName('')).toBe('English');
        });

        it('should handle null and undefined', () => {
            expect(getLanguageName(null)).toBe('English');
            expect(getLanguageName(undefined)).toBe('English');
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return array of language codes', () => {
            const languages = getSupportedLanguages();

            expect(Array.isArray(languages)).toBe(true);
            expect(languages.length).toBeGreaterThan(0);
        });

        it('should include all expected codes', () => {
            const languages = getSupportedLanguages();

            expect(languages).toContain('en');
            expect(languages).toContain('es');
            expect(languages).toContain('fr');
            expect(languages).toContain('de');
            expect(languages).toContain('pt');
        });

        it('should match keys in languageNames', () => {
            const languages = getSupportedLanguages();
            const keys = Object.keys(languageNames);

            expect(languages.sort()).toEqual(keys.sort());
        });
    });
});
