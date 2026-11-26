import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations, type Language, type TranslationKey } from '../utils/i18n';

interface LanguageContextValue {
    language: Language;
    changeLanguage: (language: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: React.PropsWithChildren) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        chrome.storage.local.get(['language'], (result) => {
            if (result.language === 'en' || result.language === 'vi') setLanguage(result.language);
        });

        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            const next = changes.language?.newValue;
            if (areaName === 'local' && (next === 'en' || next === 'vi')) setLanguage(next);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const value = useMemo<LanguageContextValue>(() => ({
        language,
        changeLanguage: (next) => {
            setLanguage(next);
            void chrome.storage.local.set({ language: next });
        },
        t: (key) => translations[language][key] || key,
    }), [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
    return context;
};

