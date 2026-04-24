'use client';

import { useTranslations } from 'next-intl';
import { useRef, useEffect, useState, useCallback } from 'react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchFloaterProps {
  value: string;
  onChange: (value: string) => void;
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void;
}

export default function SearchFloater({ value, onChange, onFlyTo }: SearchFloaterProps) {
  const t = useTranslations('map');
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const geocode = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) {
          // A 429/5xx from Nominatim should not be silently treated as
          // "no results" — surface an empty state but skip JSON parsing.
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
      } catch {
        setResults([]);
      }
    }, 400);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onChange('');
    setShowResults(false);
    setResults([]);
    onFlyTo?.(parseFloat(result.lat), parseFloat(result.lon), 17);
  };

  return (
    <div ref={containerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-[1010] w-[calc(100%-2rem)] max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            geocode(e.target.value);
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-4 pr-12 py-3 rounded-full bg-white shadow-lg text-base text-[#3A3B3E] placeholder:text-[#999] font-[Roboto] focus:outline-none focus:ring-2 focus:ring-[#009DE0]/40"
        />
        {value ? (
          <button
            onClick={() => { onChange(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#999] hover:text-[#555]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#3A3B3E]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Autocomplete results */}
      {showResults && (
        <div className="mt-1 bg-white rounded-xl shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 text-sm text-[#3A3B3E] font-[Roboto] hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2"
            >
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
  );
}
