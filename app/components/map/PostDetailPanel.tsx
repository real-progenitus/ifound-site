'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown } from '@fortawesome/free-solid-svg-icons';
import { MapPost, getCategoryIcon } from './types';
import AppDownloadModal from './AppDownloadModal';

interface PostDetailPanelProps {
  post: MapPost;
  markerScreenPos: { x: number; y: number };
  onClose: () => void;
}

const CARD_WIDTH = 320;
const CARD_MAX_HEIGHT = 540;
const MARGIN = 16;

const currencySymbol: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', BRL: 'R$', CHF: 'CHF', JPY: '¥',
  CNY: '¥', KRW: '₩', INR: '₹', RUB: '₽', TRY: '₺', PLN: 'zł',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CZK: 'Kč', HUF: 'Ft', RON: 'lei',
  AUD: 'A$', CAD: 'C$', MXN: 'MX$', ARS: 'AR$', CLP: 'CL$',
};

export default function PostDetailPanel({ post, markerScreenPos, onClose }: PostDetailPanelProps) {
  const t = useTranslations('map');
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    children.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const d = Math.abs(childCenter - center);
      if (d < closestDist) { closestDist = d; closest = i; }
    });
    setActiveImageIdx(closest);
  };

  const dateStr = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const dateStrLong = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const categoryKey = (post.category || 'other').toLowerCase();
  const categoryLabel = (() => {
    try {
      return t(`categories.${categoryKey}` as any);
    } catch {
      return post.category;
    }
  })();

  const rewardText = post.reward && post.reward !== '0'
    ? `${post.reward}${currencySymbol[post.currency] || post.currency}`
    : null;

  // Desktop: center the card in the map container
  useEffect(() => {
    const container = document.querySelector<HTMLElement>('.map-container');
    const cw = container ? container.clientWidth : window.innerWidth;
    const ch = container ? container.clientHeight : window.innerHeight;

    const cardW = Math.min(CARD_WIDTH, cw - MARGIN * 2);
    const cardH = Math.min(CARD_MAX_HEIGHT, ch - MARGIN * 2);

    setPosition({
      top: (ch - cardH) / 2,
      left: (cw - cardW) / 2,
    });
  }, [markerScreenPos]);

  const container = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.map-container') : null;
  const cw = container ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 0);
  const ch = container ? container.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const mobileSheet = (
    <>
      {/* ===== MOBILE: full-screen bottom sheet ===== */}
      <div className="md:hidden fixed inset-0 z-[2000] flex flex-col">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />

        {/* Sheet */}
        <div className="relative mt-auto w-full h-[calc(100vh-44px)] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-8 pb-5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-[22px] font-extrabold text-[#2A2B2E] tracking-tight truncate">
                {categoryLabel}
              </h3>
              {post.isPromoted && (
                <span className="inline-flex items-center gap-1 bg-[#F5A623] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
                  <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
                  {t('promoted')}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#3A3B3E] shrink-0 -mr-1"
              aria-label={t('close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-4">
            {/* Image — single, carousel, or placeholder */}
            {post.images && post.images.length > 1 ? (
              <div className="px-5">
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar"
                >
                  {post.images.map((src, i) => (
                    <div
                      key={i}
                      className="snap-start shrink-0 w-[85%] aspect-square rounded-2xl bg-gray-100 overflow-hidden"
                    >
                      <img src={src} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {post.images.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === activeImageIdx ? 'bg-[#38B6FF]' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : post.images && post.images.length === 1 ? (
              <div className="px-5">
                <div className="w-full aspect-square rounded-2xl bg-gray-100 overflow-hidden">
                  <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="px-5 flex justify-center">
                <div className="w-[min(280px,80vw)] aspect-square rounded-2xl bg-gray-100 flex items-center justify-center">
                  <img src={getCategoryIcon(post.category)} alt={post.category} className="w-20 h-20 opacity-30" />
                </div>
              </div>
            )}

            <div className="px-10">
              {/* Title + date */}
              <div className="mt-5 flex items-start flex-wrap gap-x-2 gap-y-1">
                <h2 className="text-[24px] font-extrabold text-[#2A2B2E] leading-tight tracking-tight break-words">
                  {post.title}
                </h2>
                {dateStrLong && (
                  <div className="flex items-center gap-1.5 text-[13px] text-[#6B6C70] shrink-0 mt-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="whitespace-nowrap">{dateStrLong}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {post.description && (
                <div className="mt-5">
                  <h4 className="text-[16px] font-bold text-[#2A2B2E] mb-2">{t('description')}</h4>
                  <p className="text-[15px] text-[#4A4B4E] leading-relaxed whitespace-pre-wrap">
                    {post.description}
                  </p>
                </div>
              )}

              {/* Reward */}
              {rewardText && (
                <div className="mt-6 text-center">
                  <p className="text-[40px] font-extrabold text-[#2A2B2E] tracking-tight">
                    {rewardText}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky download button */}
          <div className="px-5 pb-6 pt-3 shrink-0 bg-white">
            <button
              onClick={() => setDownloadOpen(true)}
              className="w-full py-4 rounded-full bg-[#38B6FF] text-white text-[17px] font-bold shadow-md active:bg-[#2AA8F0] transition-colors flex items-center justify-center gap-2"
            >
              <img src="/favicon.png" alt="" className="w-6 h-6" />
              {t('contactCta')}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {mounted && typeof document !== 'undefined' && createPortal(mobileSheet, document.body)}

      {/* ===== DESKTOP: floating centered card ===== */}
      {position && (
        <div className="hidden md:block">
          {/* Backdrop — click to close */}
          <div
            className="absolute inset-0 z-[1100]"
            onClick={onClose}
          />

          {/* Floating card */}
          <div
            ref={cardRef}
            className="absolute z-[1200] bg-white font-[var(--font-geist-sans)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-pop-in"
            style={{
              top: position.top,
              left: position.left,
              width: Math.min(CARD_WIDTH, cw - MARGIN * 2),
              maxHeight: descExpanded ? Math.min(600, ch - MARGIN * 2) : Math.min(CARD_MAX_HEIGHT, ch - MARGIN * 2),
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors z-10 shadow-sm"
            >
              <svg className="w-4 h-4 text-[#3A3B3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Promoted corner badge */}
            {post.isPromoted && (
              <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-2xl bg-[#F5A623] flex items-center justify-center z-10">
                <FontAwesomeIcon icon={faCrown} className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Image */}
            {post.images && post.images.length > 0 ? (
              <div className="w-full h-52 bg-gray-100 overflow-hidden flex-shrink-0 rounded-t-2xl">
                <img
                  src={post.images[0]}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center flex-shrink-0 rounded-t-2xl">
                <img
                  src={getCategoryIcon(post.category)}
                  alt={post.category}
                  className="w-16 h-16 opacity-40"
                />
              </div>
            )}

            {/* Content — scrollable */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                    post.type === 'Lost' ? 'bg-[#FF5449]' : 'bg-[#009DE0]'
                  }`}
                >
                  {post.type === 'Lost' ? t('lost') : t('found')}
                </span>
                {rewardText && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#83D1B0] text-white">
                    💰 {rewardText}
                  </span>
                )}
                {dateStr && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#555] bg-gray-100 px-2.5 py-1 rounded-full">
                    <svg className="w-3 h-3 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {dateStr}
                  </span>
                )}
              </div>
              <h2 className="text-[17px] font-extrabold text-[#2A2B2E] tracking-tight leading-snug">{post.title}</h2>

              {post.description && (
                <div>
                  <p className={`text-[13px] text-[#4A4B4E] leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>{post.description}</p>
                  {post.description.length > 120 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="text-xs text-[#009DE0] font-semibold mt-1 hover:underline"
                    >
                      {descExpanded ? t('seeLess') : t('seeMore')}
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* Contact button */}
            <div className="px-4 pb-4 pt-2 shrink-0 bg-white">
              <button
                onClick={() => setDownloadOpen(true)}
                className="w-full py-3 rounded-full bg-[#38B6FF] text-white text-[15px] font-bold shadow-md hover:bg-[#2AA8F0] transition-colors flex items-center justify-center gap-2"
              >
                <img src="/favicon.png" alt="" className="w-5 h-5" />
                {t('contactCta')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared download modal */}
      <AppDownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </>
  );
}
