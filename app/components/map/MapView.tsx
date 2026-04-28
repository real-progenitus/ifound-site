'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { MapPost, PartnerLocation, RegionCounter } from './types';
import { getCachedPosts, setCacheTile, getMergedCachedPosts } from './postCache';
import MapHeader from './MapHeader';
import PostDetailPanel from './PostDetailPanel';
import PostListPanel from './PostListPanel';
import PartnerLocationModal from './PartnerLocationModal';
import { createLogger } from '@/lib/logger';

const log = createLogger('map-view');

interface GoogleMapProps {
  posts: MapPost[];
  partners: PartnerLocation[];
  regionCounters: RegionCounter[];
  categoryFilter: string | null;
  selectedPostId: string | null;
  flyTo: { lat: number; lng: number; zoom: number; ts: number } | null;
  onPostClick: (post: MapPost, screenPos: { x: number; y: number }) => void;
  onPartnerClick?: (partner: PartnerLocation) => void;
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onZoomChange?: (zoom: number) => void;
}

const GoogleMap = dynamic<GoogleMapProps>(() => import('./GoogleMap') as Promise<{ default: ComponentType<GoogleMapProps> }>, { ssr: false });

export default function MapView() {
  const [posts, setPosts] = useState<MapPost[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('map-posts');
        if (cached) return JSON.parse(cached) as MapPost[];
      } catch { /* ignore */ }
    }
    return [];
  });
  const [partners, setPartners] = useState<PartnerLocation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('map-partners');
        if (cached) return JSON.parse(cached) as PartnerLocation[];
      } catch { /* ignore */ }
    }
    return [];
  });
  const [regionCounters, setRegionCounters] = useState<RegionCounter[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('map-region-counters');
        if (cached) return JSON.parse(cached) as RegionCounter[];
      } catch { /* ignore */ }
    }
    return [];
  });
  const [selectedPost, setSelectedPost] = useState<MapPost | null>(null);
  const [markerScreenPos, setMarkerScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number; ts: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(6);
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  // Measured height of the mobile header (search row + category pills).
  // Used to size the expanded bottom sheet so it never gets overlayed by
  // the fixed header on real devices (which can be taller than the
  // hardcoded estimate due to iOS safe-area insets).
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(140);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const tMap = useTranslations('map');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postsRef = useRef<MapPost[]>(posts);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // Lock document scroll while the map page is mounted. Without this, mobile
  // browsers happily scroll the body when the user pans or swipes, and 100vh
  // ends up taller than the visible viewport so the bottom sheet sits below
  // the fold on first paint.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.touchAction = prev.bodyTouchAction;
    };
  }, []);

  // Track the rendered height of the mobile header so the expanded sheet
  // sits flush below it (handles safe-area insets, taller URL bars, etc.).
  useEffect(() => {
    const el = document.getElementById('mobile-map-header');
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setMobileHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const samePostIdSet = useCallback((a: MapPost[], b: MapPost[]) => {
    if (a.length !== b.length) return false;
    const ids = new Set(a.map((p) => p.id));
    for (const p of b) {
      if (!ids.has(p.id)) return false;
    }
    return true;
  }, []);

  // Fetch region counters once.
  // A non-2xx response MUST NOT be parsed/cached — a transient 500 or HTML
  // error page would otherwise poison sessionStorage with bogus data.
  useEffect(() => {
    fetch('/api/region-counters')
      .then(async (r) => {
        if (!r.ok) {
          log.warn('region-counters fetch failed', { status: r.status });
          return null;
        }
        try {
          return (await r.json()) as RegionCounter[];
        } catch (err) {
          log.warn('region-counters response was not valid JSON', { error: String(err) });
          return null;
        }
      })
      .then((data) => {
        if (!data) return;
        setRegionCounters(data);
        try { sessionStorage.setItem('map-region-counters', JSON.stringify(data)); } catch { /* ignore */ }
      })
      .catch((err) => log.error('failed to fetch region counters', err));
  }, []);

  // Fetch partners once. Same fail-closed policy as region counters.
  useEffect(() => {
    fetch('/api/partner-locations')
      .then(async (r) => {
        if (!r.ok) {
          log.warn('partner-locations fetch failed', { status: r.status });
          return null;
        }
        try {
          return (await r.json()) as PartnerLocation[];
        } catch (err) {
          log.warn('partner-locations response was not valid JSON', { error: String(err) });
          return null;
        }
      })
      .then((data) => {
        if (!data) return;
        setPartners(data);
        try { sessionStorage.setItem('map-partners', JSON.stringify(data)); } catch { /* ignore */ }
      })
      .catch((err) => log.error('failed to fetch partner locations', err));
  }, []);

  // Keeps track of the latest bounds so the merge after fetching uses current viewport
  const latestBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);

  // Debounced fetch for map posts based on bounds — uses tile cache
  const fetchPosts = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    latestBoundsRef.current = bounds;
    setCurrentBounds(bounds);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const currentBounds = latestBoundsRef.current ?? bounds;

      // 1. Show whatever is already in cache immediately (stale-while-revalidate)
      const { posts: cachedNow, missingTiles } = getCachedPosts(currentBounds);
      log.debug('bounds changed', {
        tilesToFetch: missingTiles.length,
        postsFromCache: cachedNow.length,
      });
      if (cachedNow.length > 0) {
        if (!samePostIdSet(postsRef.current, cachedNow)) {
          setPosts(cachedNow);
        }
      }

      // 2. Nothing to fetch — all tiles are fresh
      if (missingTiles.length === 0) {
        log.debug('all tiles fresh — skipping network request');
        return;
      }

      setLoading(true);
      try {
        // 3. Fetch all stale/missing tiles in parallel.
        // Non-2xx responses MUST NOT be cached — otherwise a transient 500 (e.g.
        // missing Firestore index, rate limit, network blip) poisons the cache
        // with an empty array for CACHE_TTL, making it look like the area has
        // no posts until the TTL expires.
        log.debug('fetching tiles', {
          count: missingTiles.length,
          tiles: missingTiles.map((t) => t.key),
        });
        await Promise.all(
          missingTiles.map(async (tile) => {
            const params = new URLSearchParams({
              north: tile.bounds.north.toString(),
              south: tile.bounds.south.toString(),
              east: tile.bounds.east.toString(),
              west: tile.bounds.west.toString(),
            });
            try {
              const res = await fetch(`/api/map-posts?${params}`);
              if (!res.ok) {
                log.warn('tile fetch failed — not caching', {
                  tile: tile.key,
                  status: res.status,
                });
                return;
              }
              const data = (await res.json()) as MapPost[];
              if (!Array.isArray(data)) {
                log.warn('tile response was not an array — not caching', { tile: tile.key });
                return;
              }
              setCacheTile(tile.key, data);
            } catch (err) {
              log.warn('tile network error — not caching', { tile: tile.key });
              log.debug('tile network error detail', { tile: tile.key, error: String(err) });
            }
          })
        );

        // 4. Merge all tiles (freshly fetched + any other cached tiles in viewport)
        const merged = getMergedCachedPosts(latestBoundsRef.current ?? bounds);
        log.debug('merged tiles', { posts: merged.length });
        if (!samePostIdSet(postsRef.current, merged)) {
          setPosts(merged);
        }
        try { sessionStorage.setItem('map-posts', JSON.stringify(merged)); } catch { /* ignore */ }
      } catch (e) {
        log.error('failed to fetch posts', e);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [samePostIdSet]);

  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (categoryFilter) {
      if (categoryFilter === 'Electronics') {
        result = result.filter((p) => p.category === 'Electronics' || p.category === 'Eletronics');
      } else {
        result = result.filter((p) => p.category === categoryFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, searchQuery, categoryFilter]);

  const isInCurrentBounds = useCallback((p: MapPost) => {
    if (!currentBounds) return true;
    const withinLat = p.latitude <= currentBounds.north && p.latitude >= currentBounds.south;

    // Handle normal and antimeridian-crossing bounds.
    const withinLng = currentBounds.west <= currentBounds.east
      ? p.longitude >= currentBounds.west && p.longitude <= currentBounds.east
      : p.longitude >= currentBounds.west || p.longitude <= currentBounds.east;

    return withinLat && withinLng;
  }, [currentBounds]);

  const viewportPosts = useMemo(() => {
    return filteredPosts.filter(isInCurrentBounds);
  }, [filteredPosts, isInCurrentBounds]);

  const sortedPosts = useMemo(() => {
    return [...viewportPosts].sort((a, b) => {
      const score = (p: MapPost) =>
        (p.isPromoted ? 4 : 0) +
        (p.images && p.images.length > 0 ? 2 : 0) +
        (p.reward && p.reward !== '0' ? 1 : 0);
      const scoreDiff = score(b) - score(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    });
  }, [viewportPosts]);

  // Items posted at the currently-selected partner location.
  // Source set is `posts` (the full cache), NOT `filteredPosts` — we want
  // every item the partner has, ignoring the global category filter,
  // because the user opened the partner specifically to browse its items.
  const partnerPosts = useMemo(() => {
    if (!selectedPartner) return [];
    return posts
      .filter((p) => p.partnerLocationId === selectedPartner.id)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [posts, selectedPartner]);

  return (
    <div
      className="relative flex flex-col w-full overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Header: fixed transparent overlay on mobile, in-flow on desktop */}
      <MapHeader
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onFlyTo={(lat, lng, zoom) => setFlyTo({ lat, lng, zoom: zoom ?? 14, ts: Date.now() })}
        categoryFilter={categoryFilter}
        onCategorySelect={setCategoryFilter}
        fullScreenMap={mapZoom < 10}
      />

      {/* Body: fills full height on mobile (header is fixed/out-of-flow), split layout on desktop */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Map panel ── */}
        <div className={`relative h-full overflow-hidden bg-white transition-all duration-500 ease-in-out flex-1 ${mapZoom >= 10 ? 'md:p-10' : ''}`}>
          <div className={`map-container relative w-full h-full overflow-hidden transition-all duration-500 ease-in-out ${mapZoom >= 10 ? 'md:rounded-2xl' : ''}`}>
            {/* Loading pill — desktop only, top of map */}
            {loading && (
              <div className="hidden md:block absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-full px-3.5 py-2 shadow-md text-sm font-[550] text-[#3A3B3E]">
                Loading...
              </div>
            )}

            {/* Map */}
            <GoogleMap
              posts={filteredPosts}
              partners={partners}
              regionCounters={regionCounters}
              categoryFilter={categoryFilter}
              selectedPostId={selectedPost?.id ?? null}
              flyTo={flyTo}
              onPostClick={(post, screenPos) => {
                setSelectedPost(post);
                setMarkerScreenPos(screenPos);
              }}
              onPartnerClick={(partner) => {
                // Opening a partner modal closes any existing post detail
                // so the two layers can never stack with stale state.
                setSelectedPost(null);
                setMarkerScreenPos(null);
                setSelectedPartner(partner);
              }}
              onZoomChange={setMapZoom}
              onBoundsChange={fetchPosts}
            />

            {/* Partner-location modal — sits below PostDetailPanel so the
                post detail can open on top when the user picks an item. */}
            {selectedPartner && (
              <PartnerLocationModal
                partner={selectedPartner}
                posts={partnerPosts}
                onClose={() => setSelectedPartner(null)}
                onPostClick={(post) => {
                  setSelectedPost(post);
                  setMarkerScreenPos({ x: 0, y: 0 });
                }}
              />
            )}

            {/* Floating popup (kept on both desktop and mobile) */}
            {selectedPost && markerScreenPos && (
              <PostDetailPanel
                post={selectedPost}
                markerScreenPos={markerScreenPos}
                onClose={() => { setSelectedPost(null); setMarkerScreenPos(null); }}
              />
            )}
          </div>
        </div>

        {/* ── Desktop right panel — hidden in bubble view ── */}
        <div className={`hidden md:flex md:flex-col flex-shrink-0 h-full bg-white transition-all duration-500 ease-in-out ${mapZoom < 10 ? 'md:w-0 opacity-0 pointer-events-none overflow-hidden' : 'md:w-[42%] opacity-100 overflow-hidden'}`}>
          <PostListPanel
            posts={sortedPosts}
            selectedPost={selectedPost}
            loading={loading}
            onCardClick={(post) => {
              setSelectedPost(post);
              setMarkerScreenPos({ x: 0, y: 0 });
              setFlyTo({ lat: post.latitude, lng: post.longitude, zoom: 15, ts: Date.now() });
            }}
          />
        </div>

        {/* Loading pill (mobile) — floats just above the bottom sheet */}
        {loading && (
          <div
            className="md:hidden absolute left-1/2 -translate-x-1/2 z-[1150] bg-white rounded-full px-3.5 py-2 shadow-md text-sm font-[550] text-[#3A3B3E] pointer-events-none"
            style={{
              bottom: `${(dragHeight !== null ? dragHeight : (sheetExpanded ? (typeof window !== 'undefined' ? window.innerHeight - mobileHeaderHeight : 500) : 92)) + 12}px`,
              transition: dragHeight !== null ? 'none' : 'bottom 300ms ease-in-out',
            }}
          >
            Loading...
          </div>
        )}

        {/* ── Mobile bottom sheet — always visible, peek / expanded ──
            z-[1100] so the sheet sits above the fixed mobile header (z-[1000])
            when fully expanded; otherwise the category pill row would clip
            into the top of the sheet on real devices. */}
        <div
          className="md:hidden absolute bottom-0 left-0 right-0 z-[1100] bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
          style={{
            height: dragHeight !== null
              ? `${dragHeight}px`
              : (sheetExpanded ? `calc(100dvh - ${mobileHeaderHeight}px)` : '92px'),
            transition: dragHeight !== null ? 'none' : 'height 300ms ease-in-out',
          }}
        >
          {/* Handle + count — tap or drag to toggle */}
          <div
            className="flex flex-col items-center pt-4 pb-1.5 cursor-pointer select-none shrink-0"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              const maxHeight = window.innerHeight - mobileHeaderHeight;
              const currentHeight = sheetExpanded ? maxHeight : 92;
              dragStartRef.current = { startY: e.clientY, startHeight: currentHeight };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragStartRef.current) return;
              const delta = dragStartRef.current.startY - e.clientY;
              const maxHeight = window.innerHeight - mobileHeaderHeight;
              const next = Math.max(92, Math.min(maxHeight, dragStartRef.current.startHeight + delta));
              setDragHeight(next);
            }}
            onPointerUp={(e) => {
              if (!dragStartRef.current) return;
              const delta = dragStartRef.current.startY - e.clientY;
              const moved = Math.abs(delta) > 5;
              const maxHeight = window.innerHeight - mobileHeaderHeight;
              if (!moved) {
                setSheetExpanded((p) => !p);
              } else {
                const endHeight = dragStartRef.current.startHeight + delta;
                const threshold = (maxHeight + 92) / 2;
                setSheetExpanded(endHeight > threshold);
              }
              dragStartRef.current = null;
              setDragHeight(null);
              try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
            }}
            onPointerCancel={(e) => {
              dragStartRef.current = null;
              setDragHeight(null);
              try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
            }}
          >
            <div className="w-10 h-1.5 bg-black rounded-full mb-4" />
            <p className="text-[17px] font-[550] text-[#2A2B2E]" suppressHydrationWarning>
              {tMap('nearbyItems', { count: sortedPosts.length })}
            </p>
          </div>
          {/* List content — hidden when collapsed (peek), visible when expanding/expanded */}
          <div
            className="flex-1 overflow-hidden min-h-0 transition-opacity duration-200"
            style={{
              opacity: sheetExpanded || dragHeight !== null ? 1 : 0,
              pointerEvents: sheetExpanded || dragHeight !== null ? 'auto' : 'none',
            }}
          >
            <PostListPanel
              posts={sortedPosts}
              selectedPost={selectedPost}
              loading={loading}
              variant="list"
              onCardClick={(post) => {
                setSelectedPost(post);
                setMarkerScreenPos({ x: 0, y: 0 });
                setFlyTo({ lat: post.latitude, lng: post.longitude, zoom: 15, ts: Date.now() });
                setSheetExpanded(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
