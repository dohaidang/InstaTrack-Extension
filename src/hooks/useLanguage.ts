import { useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../utils/i18n';

export const useLanguage = () => {
    const [language, setLanguage] = useState<Language>('en');

    // Load language from storage on mount and listen for changes
    useEffect(() => {
        // Initial load
        chrome.storage.local.get(['language'], (result) => {
            if (result.language) {
                setLanguage(result.language as Language);
            }
        });

        // Listen for changes
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes.language) {
                setLanguage(changes.language.newValue as Language);
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Function to change language
    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        chrome.storage.local.set({ language: lang });
    };

    // Helper to get translation
    const t = (key: TranslationKey): string => {
        return translations[language][key] || key;
    };

    return { language, changeLanguage, t };
};
