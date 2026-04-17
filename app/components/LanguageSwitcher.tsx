'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/routing';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
    const currentLocale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const locales = [
        { code: 'en', flag: '🇬🇧', label: 'English' },
        { code: 'pt', flag: '🇵🇹', label: 'Português' },
        { code: 'es', flag: '🇪🇸', label: 'Español' },
        { code: 'fr', flag: '🇫🇷', label: 'Français' },
        { code: 'it', flag: '🇮🇹', label: 'Italiano' },
        { code: 'de', flag: '🇩🇪', label: 'Deutsch' }
    ];

    const currentLocaleData = locales.find(loc => loc.code === currentLocale);

    const handleLocaleChange = (newLocale: string) => {
        setIsOpen(false);
        router.push(pathname, { locale: newLocale });
        router.refresh();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white text-base font-medium hover:opacity-75 transition-opacity cursor-pointer flex items-center gap-2"
                title={currentLocaleData?.label}
            >
                <span className="text-2xl max-[599px]:text-2xl">{currentLocaleData?.flag}</span>
                <svg
                    className={`w-4 h-4 max-[599px]:w-4 max-[599px]:h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden min-w-[140px] max-[599px]:min-w-[180px] z-50">
                    {locales.map((locale) => {
                        const isActive = currentLocale === locale.code;
                        return (
                            <button
                                key={locale.code}
                                onClick={() => handleLocaleChange(locale.code)}
                                className={`w-full flex items-center gap-3 max-[599px]:gap-4 px-4 max-[599px]:px-5 py-2.5 max-[599px]:py-3.5 hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-50 font-medium' : ''
                                    }`}
                            >
                                <span className="text-xl max-[599px]:text-2xl">{locale.flag}</span>
                                <span className="text-sm max-[599px]:text-base text-gray-800">{locale.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
