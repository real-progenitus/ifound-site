'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import LanguageSwitcher from '../LanguageSwitcher';
import { useRef, useEffect, useState, useCallback } from 'react';

const CATEGORIES = [
  { key: 'pets', icon: '/paw.svg', filterValue: 'Pets' },
  { key: 'persons', icon: '/person.svg', filterValue: 'Persons' },
  { key: 'wallets', icon: '/wallet.svg', filterValue: 'Wallets' },
  { key: 'keys', icon: '/key.svg', filterValue: 'Keys' },
  { key: 'electronics', icon: '/earpods.svg', filterValue: 'Electronics' },
  { key: 'phones', icon: '/phone.svg', filterValue: 'Phones' },
  { key: 'glasses', icon: '/glasses.svg', filterValue: 'Glasses' },
  { key: 'clothes', icon: '/tshirt.svg', filterValue: 'Clothes' },
  { key: 'vehicles', icon: '/vehicles.svg', filterValue: 'Vehicles' },
  { key: 'other', icon: '/box.svg', filterValue: 'Other' },
];

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapHeaderProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
  categoryFilter: string | null;
  onCategorySelect: (cat: string | null) => void;
  fullScreenMap?: boolean;
}

export default function MapHeader({ searchValue, onSearchChange, onFlyTo, categoryFilter, onCategorySelect, fullScreenMap = false }: MapHeaderProps) {
  const nav = useTranslations('nav');
  const t = useTranslations('map');
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = desktopContainerRef.current?.contains(target);
      const inMobile = mobileContainerRef.current?.contains(target);
      if (!inDesktop && !inMobile) setShowResults(false);
      if (!filterContainerRef.current?.contains(target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const geocode = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) {
          // Don't parse a 429/5xx body as JSON — treat as empty, but
          // don't surface a misleading "no results" popup either.
          setResults([]);
          setShowResults(false);
          return;
        }
        const data = (await res.json()) as SearchResult[];
        if (!Array.isArray(data)) {
          setResults([]);
          setShowResults(false);
          return;
        }
        setResults(data);
        setShowResults(data.length > 0);
      } catch { setResults([]); }
    }, 400);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSearchChange('');
    setShowResults(false);
    setResults([]);
    setMobileMenuOpen(false);
    onFlyTo(parseFloat(result.lat), parseFloat(result.lon), 17);
  };

  return (
    <>
      {/* ===== MOBILE: fixed transparent overlay ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[1000]">
        {/* Row 1: hamburger + search */}
        <div className="flex items-center gap-3 px-4 pt-8 pb-2">
          <Link href="/" className="shrink-0" aria-label="Home">
            <img src="/favicon.png" alt="iFound" width={56} height={56} className="object-contain [filter:drop-shadow(0_5px_8px_rgba(0,0,0,0.4))]" />
          </Link>

          {/* Mobile search */}
          <div ref={mobileContainerRef} className="relative flex-1">
            <input
              ref={mobileInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => { onSearchChange(e.target.value); geocode(e.target.value); }}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-5 pr-11 py-3 rounded-full bg-white shadow-md text-base text-[#3A3B3E] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#009DE0]/40 transition-colors"
            />
            {searchValue ? (
              <button
                onClick={() => { onSearchChange(''); setResults([]); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
            {showResults && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg overflow-hidden z-[2000]">
                {results.map((r, i) => (
                  <button key={i} onClick={() => handleSelect(r)}
                    className="w-full text-left px-4 py-3 text-sm text-[#3A3B3E] hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#999] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: category pills — always visible */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-1 pb-3">
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat.filterValue;
            return (
              <button
                key={cat.key}
                onClick={() => onCategorySelect(isActive ? null : cat.filterValue)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-[550] whitespace-nowrap shrink-0 transition-colors shadow-md ${
                  isActive ? 'bg-black text-white' : 'bg-white text-[#3A3B3E]'
                }`}
              >
                <img src={cat.icon} alt="" className="w-6 h-6" style={isActive ? { filter: 'brightness(0) invert(1)' } : {}} />
                <span>{t(`categories.${cat.key}` as any)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile full-screen menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[2000] bg-[#38B6FF] flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <img src="/favicon.png" alt="iFound" width={48} height={48} className="object-contain" />
              <span className="text-white text-3xl font-bold leading-none">ifound</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col items-center justify-center gap-7 flex-1">
            <div className="mb-2">
              <LanguageSwitcher />
            </div>
            {([
              { href: '/', label: 'Home' },
              { href: '/about', label: nav('aboutUs') },
              { href: '/faqs', label: nav('faqs') },
              { href: '/contact', label: nav('contacts') },
              { href: '/partner', label: nav('becomePartner') },
            ] as const).map((link) => (
              <Link
                key={link.href}
                href={link.href as any}
                className="text-white text-2xl font-medium hover:text-white/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* ===== DESKTOP: in-flow header ===== */}
      <header
        className={`hidden md:flex z-[1000] h-28 items-center justify-between px-8 transition-colors ${
          fullScreenMap
            ? 'absolute top-0 left-0 right-0 bg-transparent'
            : 'w-full shrink-0 bg-[#38B6FF] border-b border-[#2AA8F0] shadow-sm'
        }`}
      >
        {/* Left: logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <img src="/favicon.png" alt="iFound" width={64} height={64} className="object-contain" />
            <span className="text-white text-5xl font-bold leading-none">ifound</span>
          </Link>
        </div>

        {/* Center: search + filter */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl mx-8">
          <div ref={desktopContainerRef} className="relative flex-1">
            <input
              ref={desktopInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => { onSearchChange(e.target.value); geocode(e.target.value); }}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-5 pr-11 py-3 rounded-full border border-gray-200 bg-gray-50 text-base text-[#3A3B3E] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#009DE0]/40 focus:bg-white transition-colors"
            />
            {searchValue ? (
              <button
                onClick={() => { onSearchChange(''); setResults([]); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
            {showResults && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg overflow-hidden z-[2000]">
                {results.map((r, i) => (
                  <button key={i} onClick={() => handleSelect(r)}
                    className="w-full text-left px-4 py-3 text-sm text-[#3A3B3E] hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#999] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter button + dropdown */}
          <div ref={filterContainerRef} className="relative shrink-0">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className={`relative flex items-center gap-2 px-4 py-3 rounded-full border border-gray-200 text-base font-semibold transition-colors ${
                categoryFilter
                  ? 'bg-[#009DE0] text-white border-[#009DE0]'
                  : 'bg-gray-50 text-[#3A3B3E] hover:bg-white'
              }`}
              aria-label="Filter"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {categoryFilter && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-white text-[#009DE0]">1</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl z-[2000] p-4 w-[420px] max-w-[calc(100vw-2rem)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[14px] font-bold text-[#2A2B2E]">{t('category')}</h4>
                  {categoryFilter && (
                    <button
                      onClick={() => onCategorySelect(null)}
                      className="text-xs text-[#009DE0] font-semibold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = categoryFilter === cat.filterValue;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => onCategorySelect(isActive ? null : cat.filterValue)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm whitespace-nowrap transition-colors shadow-sm font-semibold ${
                          isActive ? 'bg-black text-white' : 'bg-gray-100 text-[#3A3B3E] hover:bg-gray-200'
                        }`}
                      >
                        <img src={cat.icon} alt="" className="w-4 h-4" style={isActive ? { filter: 'brightness(0) invert(1)' } : {}} />
                        <span>{t(`categories.${cat.key}` as any)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: language switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="[&_button]:!text-[#3A3B3E] [&_svg]:!text-[#3A3B3E] [&_path]:![stroke-width:4]">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
    </>
  );
}
