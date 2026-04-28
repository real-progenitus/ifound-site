'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { MapPost, PartnerLocation } from './types';
import PostCard from './PostCard';

interface PartnerLocationModalProps {
  partner: PartnerLocation;
  posts: MapPost[];
  onClose: () => void;
  onPostClick: (post: MapPost) => void;
}

/**
 * Modal opened when a partner pin is clicked on the map. Shows the
 * partner's profile (logo + name), a search box, and the list of items
 * posted at this partner location. Mirrors the mobile UX shown to the
 * partner-location browsing flow in the React Native app, minus the
 * category filter row (intentionally omitted per product decision).
 *
 * - Mobile: full-height bottom sheet (matches the existing PostDetailPanel
 *   layout so transitions feel consistent).
 * - Desktop: centered floating card.
 *
 * z-index sits at 1900 — below PostDetailPanel (2000) so clicking a post
 * inside the partner list opens the post detail on top of the partner
 * modal, and closing the post detail reveals the partner list again.
 */
export default function PartnerLocationModal({
  partner,
  posts,
  onClose,
  onPostClick,
}: PartnerLocationModalProps) {
  const t = useTranslations('map');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset search when switching to a different partner so the previous
  // partner's query doesn't leak into the new list.
  useEffect(() => {
    setSearch('');
  }, [partner.id]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const initials =
    partner.title
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';

  const Logo = (
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-gray-100 shrink-0 ring-1 ring-gray-200">
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt={partner.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#009DE0]/15 text-[#009DE0] text-[14px] font-bold">
          {initials}
        </div>
      )}
    </div>
  );

  const SearchBar = (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchItem')}
        className="w-full pl-5 pr-12 py-3 rounded-full bg-white shadow-md text-base text-[#3A3B3E] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#009DE0]/40"
      />
      {search ? (
        <button
          onClick={() => setSearch('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#999] hover:text-[#555]"
          aria-label={t('close')}
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
  );

  const PostList =
    filteredPosts.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
        </svg>
        <p className="text-[14px] font-semibold text-[#888]">
          {search ? t('noResults') : t('noItemsAtPartner')}
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isSelected={false}
            onClick={onPostClick}
            variant="list"
          />
        ))}
      </div>
    );

  const CloseButton = (
    <button
      onClick={onClose}
      className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#3A3B3E] shrink-0 transition-colors"
      aria-label={t('close')}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  const mobileSheet = (
    <div className="md:hidden fixed inset-0 z-[1900] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Bottom sheet — sized so the map is still partially visible above
          and the user feels they can dismiss back to the map easily. */}
      <div className="relative mt-auto w-full h-[78dvh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header — logo + name + close */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
          {Logo}
          <h2 className="flex-1 text-[22px] font-extrabold text-[#2A2B2E] tracking-tight truncate">
            {partner.title}
          </h2>
          {CloseButton}
        </div>

        {/* Search */}
        <div className="px-5 pb-4 shrink-0">{SearchBar}</div>

        {/* Post list */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">{PostList}</div>
      </div>
    </div>
  );

  const desktopCard = (
    <div className="hidden md:flex absolute inset-0 z-[1900] items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Centered card — fixed height so the modal feels like a real list
          view even when the partner has few items. Inner list scrolls; the
          card itself doesn't shrink to content. */}
      <div className="relative z-10 w-[480px] max-w-[calc(100vw-3rem)] h-[min(70vh,620px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0 border-b border-gray-100">
          {Logo}
          <h2 className="flex-1 text-[22px] font-extrabold text-[#2A2B2E] tracking-tight truncate">
            {partner.title}
          </h2>
          {CloseButton}
        </div>

        {/* Search */}
        <div className="px-6 py-4 shrink-0">{SearchBar}</div>

        {/* Post list */}
        <div className="flex-1 overflow-y-auto px-4 pb-5">{PostList}</div>
      </div>
    </div>
  );

  if (!mounted || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(mobileSheet, document.body)}
      {desktopCard}
    </>
  );
}
