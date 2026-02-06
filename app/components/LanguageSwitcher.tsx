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
        { code: 'pt', flag: '🇵🇹', label: 'Português' }
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
                className="text-white text-base font-medium hover:opacity-75 transition-opacity cursor-pointer flex items-center gap-1.5"
                title={currentLocaleData?.label}
            >
                <span className="uppercase">{currentLocale}</span>
                <svg
                    className={`w-3 h-3 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden min-w-[140px] z-50">
                    {locales.map((locale) => {
                        const isActive = currentLocale === locale.code;
                        return (
                            <button
                                key={locale.code}
                                onClick={() => handleLocaleChange(locale.code)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-50 font-medium' : ''
                                    }`}
                            >
                                <span className="text-xl">{locale.flag}</span>
                                <span className="text-sm text-gray-800">{locale.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
