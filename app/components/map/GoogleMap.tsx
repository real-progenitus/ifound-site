'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPost, PartnerLocation, RegionCounter, getPinIcon } from './types';

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

const DOT_ZOOM_THRESHOLD = 10;
const PIN_ZOOM_THRESHOLD = 15;
const MAX_INDIVIDUAL_MARKERS = 300;
const SHOW_ALL_COUNTERS_ZOOM = 3;

// Singleton loader promise — only loads once per page session.
//
// SECURITY: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is intentionally public (browser-
// loaded Maps JS cannot use a secret). The key MUST be locked down in Google
// Cloud Console or anyone can scrape it and burn our quota:
//   • Application restriction: HTTP referrers
//       - https://ifound.tech/*
//       - https://*.ifound.tech/*
//       - http://localhost:3000/*   (dev only)
//   • API restriction: Maps JavaScript API only
// See: https://developers.google.com/maps/api-security-best-practices
let loaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  if (!key && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[GoogleMap] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — the map will fail to load.'
    );
  }
  setOptions({ key, v: 'weekly' });
  loaderPromise = importLibrary('maps').then(() => undefined);
  return loaderPromise;
}

// --- Icon helpers using SVG data URIs ---

function bubbleIcon(size: number, label: string, fontSize: number): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><radialGradient id="g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#F4A261"/>
      <stop offset="60%" stop-color="#E76F51"/>
      <stop offset="100%" stop-color="#C1440E"/>
    </radialGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
    <text x="${size / 2}" y="${size / 2}" dy="0.35em" text-anchor="middle"
      fill="white" font-weight="700" font-size="${fontSize}px"
      font-family="Roboto,sans-serif">${label}</text>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    size: new google.maps.Size(size, size),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

// SVG-based dot with a soft drop shadow.
//
// Mirrors the React Native shadow values used in the mobile app:
//   regular  → grey drop shadow  (offset 0/3, opacity 0.2, radius 4)
//   promoted → gold glow         (offset 0/0, opacity 0.6, radius 4)
// We build the icon as an SVG data-URI because google.maps.Symbol (SymbolPath.CIRCLE)
// has no shadow support.
function dotIcon(
  color: string,
  size: number,
  variant: 'regular' | 'promoted' = 'regular'
): google.maps.Icon {
  // Padding leaves room for the blur + offset of the drop shadow so it
  // doesn't get clipped at the SVG viewport edges.
  const pad = 6;
  const total = size + pad * 2;
  const c = total / 2;
  const r = size / 2;

  const filter =
    variant === 'promoted'
      ? `<filter id="s" x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#FFD700" flood-opacity="0.6"/>
         </filter>`
      : `<filter id="s" x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
         </filter>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">
    <defs>${filter}</defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="#FFFFFF" stroke-width="1" filter="url(#s)"/>
  </svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    size: new google.maps.Size(total, total),
    scaledSize: new google.maps.Size(total, total),
    anchor: new google.maps.Point(c, c),
  };
}

function pinIcon(url: string, height: number): google.maps.Icon {
  // Source pin assets are 26x39. Keep this aspect ratio to avoid stretch.
  const srcW = 26;
  const srcH = 39;
  const width = Math.round((height * srcW) / srcH);
  return {
    url,
    size: new google.maps.Size(width, height),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height),
  };
}

// Partner marker — teardrop pin from /public/partner-icon.svg with the
// partner's circular logo overlaid in the head. Rendered slightly larger
// (44px) than regular post pins (38px) so partner brands stand out, with
// the anchor at bottom-center so the tip lands exactly on the partner's
// lat/lng (matches `pinIcon` for posts).
//
// Why the two-path implementation:
// SVGs that Google Maps consumes as Marker icon URLs are loaded via the
// browser's <img> pipeline, which sandboxes them so they CANNOT make
// network requests for embedded <image href="https://..."> resources.
// They CAN, however, render inline data: URIs. So we pre-fetch each
// partner logo with `fetch()` (where CORS is just a normal HTTP request),
// convert the response to a base64 data URL, and inline it into the
// composite SVG. The first paint shows the plain blue pin; we swap to
// the logo'd version via marker.setIcon() as soon as the fetch resolves.

const PARTNER_PIN_PATH =
  'M19.6992 27.6133C22.796 28.6609 24.7615 30.4503 24.7617 32.5684C24.7617 35.9637 19.6987 38.5254 12.9922 38.5254C6.28584 38.5253 1.22363 35.9636 1.22363 32.5684C1.22385 30.4733 3.15824 28.6988 6.2168 27.6436C6.76737 28.3088 7.32638 28.9436 7.87695 29.54C5.10889 30.2894 3.52559 31.5668 3.52539 32.5762C3.52539 34.1056 7.1271 36.2392 13 36.2393C18.8729 36.2393 22.4746 34.1056 22.4746 32.5762C22.4744 31.5591 20.8686 30.2671 18.0547 29.5254C18.6053 28.9289 19.1564 28.2864 19.707 27.6211L19.6992 27.6133ZM13 0C20.1806 0 26 5.98789 26 13.2373C25.9998 20.4866 15.6231 30.9471 13 32.5762C10.2545 30.863 0.000230064 20.5478 0 13.2373C0 5.92672 5.81941 1.31186e-07 13 0Z';

const PARTNER_PIN_SRC_W = 26;
const PARTNER_PIN_SRC_H = 39;
const PARTNER_PIN_HEIGHT = 44;
const PARTNER_PIN_WIDTH = Math.round(
  (PARTNER_PIN_HEIGHT * PARTNER_PIN_SRC_W) / PARTNER_PIN_SRC_H
);

// Process-wide caches for partner logo data URLs. `dataUrlCache` holds
// resolved values; `inflight` coalesces concurrent fetches for the same
// URL so we don't trigger N requests when N partner markers mount in the
// same effect tick.
const logoDataUrlCache = new Map<string, string>();
const logoInflightFetches = new Map<string, Promise<string | null>>();

function fetchLogoAsDataUrl(url: string): Promise<string | null> {
  const cached = logoDataUrlCache.get(url);
  if (cached) return Promise.resolve(cached);

  const inflight = logoInflightFetches.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      // We go through our own /api/partner-logo proxy because Firebase
      // Storage does NOT include `Access-Control-Allow-Origin` on its
      // actual GET responses (only on the OPTIONS preflight), so a direct
      // browser fetch with `mode: 'cors'` is blocked. The proxy is
      // same-origin and applies SSRF defense to the upstream URL.
      const proxied = `/api/partner-logo?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxied);
      if (!res.ok) return null;
      const blob = await res.blob();
      // Skip absurdly large logos — they bloat the SVG data URI and some
      // browsers struggle to render multi-megabyte data URIs as Marker
      // icons. Anything over ~512KB falls back to the plain pin.
      if (blob.size > 512 * 1024) return null;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      logoDataUrlCache.set(url, dataUrl);
      return dataUrl;
    } catch {
      // Network failure → graceful fallback to plain pin.
      return null;
    } finally {
      logoInflightFetches.delete(url);
    }
  })();
  logoInflightFetches.set(url, promise);
  return promise;
}

function partnerIcon(logoDataUrl: string | null = null): google.maps.Icon {
  // No logo (or not yet fetched) → serve the static pin file directly.
  // Avoids the data-URI overhead and lets the browser cache the SVG.
  if (!logoDataUrl) {
    return {
      url: '/partner-icon.svg',
      size: new google.maps.Size(PARTNER_PIN_WIDTH, PARTNER_PIN_HEIGHT),
      scaledSize: new google.maps.Size(PARTNER_PIN_WIDTH, PARTNER_PIN_HEIGHT),
      anchor: new google.maps.Point(PARTNER_PIN_WIDTH / 2, PARTNER_PIN_HEIGHT),
    };
  }

  // Logo available — build a composite SVG with the logo embedded as a
  // base64 data URL, clipped to a circle inside the pin head with a thin
  // white ring around it. Image clip (r=10.5) is 0.7 viewBox units smaller
  // than the white circle (r=11.2), giving ~0.8px of visible white border
  // at the rendered 44px height. The pin head's path radius is ~13.2 so
  // r=11.2 still leaves ~2 units of blue between the ring and the pin edge.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PARTNER_PIN_WIDTH}" height="${PARTNER_PIN_HEIGHT}" viewBox="0 0 ${PARTNER_PIN_SRC_W} ${PARTNER_PIN_SRC_H}">
    <defs>
      <clipPath id="lc"><circle cx="13" cy="13" r="10.5"/></clipPath>
    </defs>
    <path d="${PARTNER_PIN_PATH}" fill="#009DE0"/>
    <circle cx="13" cy="13" r="11.2" fill="#FFFFFF"/>
    <image href="${logoDataUrl}" x="2.5" y="2.5" width="21" height="21" clip-path="url(#lc)" preserveAspectRatio="xMidYMid slice"/>
  </svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    size: new google.maps.Size(PARTNER_PIN_WIDTH, PARTNER_PIN_HEIGHT),
    scaledSize: new google.maps.Size(PARTNER_PIN_WIDTH, PARTNER_PIN_HEIGHT),
    anchor: new google.maps.Point(PARTNER_PIN_WIDTH / 2, PARTNER_PIN_HEIGHT),
  };
}

// Partner dot — the intermediate-zoom representation of a partner pin.
// Used between DOT_ZOOM_THRESHOLD and PIN_ZOOM_THRESHOLD where rendering
// the full teardrop would be visually too heavy. The "dot" is actually the
// partner's profile picture clipped into a small circle with a thin white
// ring (matches the post dot-marker visual language: subtle hairline ring
// + drop shadow for depth). When the logo isn't available we fall back to
// a solid blue dot so the partner stays visible.
//
// Anchor is centered (not bottom) since this is a circular pip, not a
// teardrop with a tip.
const PARTNER_DOT_SIZE = 18;
const PARTNER_DOT_PAD = 6;
const PARTNER_DOT_TOTAL = PARTNER_DOT_SIZE + PARTNER_DOT_PAD * 2;

function partnerDotIcon(logoDataUrl: string | null = null): google.maps.Icon {
  const total = PARTNER_DOT_TOTAL;
  const c = total / 2;
  const r = PARTNER_DOT_SIZE / 2;
  const filter = `<filter id="s" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.25"/>
  </filter>`;

  const inner = logoDataUrl
    ? // White outer disc + image clipped to a slightly smaller radius so the
      // 1-unit white ring shows around the photo (matches the pin border).
      `<defs>
         ${filter}
         <clipPath id="pdc"><circle cx="${c}" cy="${c}" r="${r - 1}"/></clipPath>
       </defs>
       <circle cx="${c}" cy="${c}" r="${r}" fill="#FFFFFF" filter="url(#s)"/>
       <image href="${logoDataUrl}" x="${c - (r - 1)}" y="${c - (r - 1)}" width="${(r - 1) * 2}" height="${(r - 1) * 2}" clip-path="url(#pdc)" preserveAspectRatio="xMidYMid slice"/>`
    : // Fallback: solid brand-blue dot when no logo is available yet.
      `<defs>${filter}</defs>
       <circle cx="${c}" cy="${c}" r="${r}" fill="#009DE0" stroke="#FFFFFF" stroke-width="1" filter="url(#s)"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">${inner}</svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    size: new google.maps.Size(total, total),
    scaledSize: new google.maps.Size(total, total),
    anchor: new google.maps.Point(c, c),
  };
}

/**
 * Approximate pixel distance between two lat/lng points at a given Google Maps zoom level.
 * Accurate enough for bubble merging (within ~5% for mid-latitudes).
 */
function latlngDistPx(lat1: number, lng1: number, lat2: number, lng2: number, zoom: number): number {
  const scale = (256 * Math.pow(2, zoom)) / 360;
  const dx = (lng2 - lng1) * scale;
  const dy = (lat2 - lat1) * scale;
  return Math.sqrt(dx * dx + dy * dy);
}

function getLngSegments(west: number, east: number): Array<[number, number]> {
  // Normal case: west <= east (no antimeridian crossing)
  if (west <= east) return [[west, east]];
  // Wrapped case: e.g. west=170, east=-170 crosses the antimeridian
  return [[west, 180], [-180, east]];
}

function lngRangesIntersect(westA: number, eastA: number, westB: number, eastB: number): boolean {
  const segA = getLngSegments(westA, eastA);
  const segB = getLngSegments(westB, eastB);
  for (const [a1, a2] of segA) {
    for (const [b1, b2] of segB) {
      if (Math.max(a1, b1) <= Math.min(a2, b2)) return true;
    }
  }
  return false;
}

function boundsIntersect(
  view: { north: number; south: number; east: number; west: number },
  region: { north: number; south: number; east: number; west: number }
): boolean {
  const latOverlap = !(region.north < view.south || region.south > view.north);
  if (!latOverlap) return false;
  return lngRangesIntersect(view.west, view.east, region.west, region.east);
}

/**
 * Convert a lat/lng to a pixel position inside the map container.
 * Used to position the PostDetailPanel popup near the clicked marker.
 */
function latLngToContainerPoint(
  map: google.maps.Map,
  lat: number,
  lng: number
): { x: number; y: number } {
  const projection = map.getProjection();
  const bounds = map.getBounds();
  if (!projection || !bounds) return { x: 0, y: 0 };

  const scale = Math.pow(2, map.getZoom() ?? 6);
  const nw = new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng());
  const worldNW = projection.fromLatLngToPoint(nw);
  const worldPt = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
  if (!worldNW || !worldPt) return { x: 0, y: 0 };

  return {
    x: Math.round((worldPt.x - worldNW.x) * scale),
    y: Math.round((worldPt.y - worldNW.y) * scale),
  };
}

export default function GoogleMap({
  posts,
  partners,
  regionCounters,
  categoryFilter,
  selectedPostId,
  flyTo,
  onPostClick,
  onPartnerClick,
  onBoundsChange,
  onZoomChange,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const bubbleMarkersRef = useRef<google.maps.Marker[]>([]);
  const postMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const partnerMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  // Tracks the visual mode of the post layer ('bubble' / 'dot' / 'pin').
  const renderModeRef = useRef<'bubble' | 'dot' | 'pin'>('bubble');
  // Tracks the visual mode of the partner layer ('dot' / 'pin'). We track
  // this separately from renderModeRef because partners don't have a bubble
  // representation — at bubble zoom they're hidden entirely. Used to detect
  // dot↔pin transitions so we can re-skin existing markers in place rather
  // than recreating them on every zoom change.
  const partnerModeRef = useRef<'dot' | 'pin'>('pin');
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onPostClickRef = useRef(onPostClick);
  const onPartnerClickRef = useRef(onPartnerClick);
  const [zoom, setZoom] = useState(6);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPostClickRef.current = onPostClick;
  }, [onPostClick]);

  useEffect(() => {
    onPartnerClickRef.current = onPartnerClick;
  }, [onPartnerClick]);

  const clearMarkers = useCallback(() => {
    bubbleMarkersRef.current.forEach((m) => m.setMap(null));
    bubbleMarkersRef.current = [];
    postMarkersRef.current.forEach((m) => m.setMap(null));
    postMarkersRef.current.clear();
    partnerMarkersRef.current.forEach((m) => m.setMap(null));
    partnerMarkersRef.current.clear();
  }, []);

  const emitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    onBoundsChange({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
  }, [onBoundsChange]);

  // --- Initialize map ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 }, // world fallback
        zoom: 3,
        minZoom: 3,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        // 'greedy' lets a single finger pan the map on touch devices, instead
        // of the default 'auto' which requires two fingers when the map is
        // not full-page. We lock body scroll on mobile so this is safe.
        gestureHandling: 'greedy',
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      mapRef.current = map;

      map.addListener('idle', () => {
        if (!mapRef.current) return;
        const z = map.getZoom() ?? 6;
        setZoom(z);
        onZoomChange?.(z);
        if (z >= DOT_ZOOM_THRESHOLD) {
          emitBounds();
        }
      });

      setReady(true);

      // Fly to user's location at a city-overview zoom
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !mapRef.current) return;
            mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            mapRef.current.setZoom(13);
          },
          () => { /* permission denied or error — stay on Iberia */ }
        );
      }
    });

    return () => {
      cancelled = true;
      clearMarkers();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- flyTo ---
  useEffect(() => {
    const map = mapRef.current;
    if (!flyTo || !map) return;
    map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    map.setZoom(flyTo.zoom);
  }, [flyTo]);

  // Set of partner-location ids that WILL be rendered as partner pins in
  // the current view. A partner is rendered when:
  //   1. We're not in bubble/counter zoom (zoom >= DOT_ZOOM_THRESHOLD)
  //   2. We have its document in `partners` (i.e. it's still active)
  //   3. At least one currently-loaded post points at it
  //
  // Because `posts` is already category-filtered upstream in MapView, the
  // active category filter is honoured automatically — partners whose only
  // posts are in another category drop off without a separate code path.
  //
  // This set drives BOTH effects below: the partner layer renders these,
  // and the post layer hides any post whose `partnerLocationId` is in it
  // (matching React Native MapMarkers — a post that belongs to a rendered
  // partner is rolled into the partner pin so they don't overlap on the
  // exact same lat/lng).
  const renderedPartnerIds = useMemo(() => {
    if (zoom < DOT_ZOOM_THRESHOLD) return new Set<string>();
    const referenced = new Set<string>();
    for (const p of posts) {
      if (p.partnerLocationId) referenced.add(p.partnerLocationId);
    }
    const result = new Set<string>();
    for (const partner of partners) {
      if (referenced.has(partner.id)) result.add(partner.id);
    }
    return result;
  }, [posts, partners, zoom]);

  // --- Render markers ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (zoom < DOT_ZOOM_THRESHOLD) {
      renderModeRef.current = 'bubble';
      const showAllCounters = zoom <= SHOW_ALL_COUNTERS_ZOOM;

      // Hide post markers while in bubble mode
      postMarkersRef.current.forEach((m) => m.setMap(null));
      postMarkersRef.current.clear();

      // ── Bubble / region-counter view ──
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      const viewBounds = {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      };

      interface Bubble {
        lat: number; lng: number; count: number;
        swLat: number; swLng: number; neLat: number; neLng: number;
        regionCount: number;
      }

      let bubbles: Bubble[] = [];

      for (const region of regionCounters) {
        const { bounds, counters } = region;
        let count: number;

        if (categoryFilter) {
          if (categoryFilter === 'Electronics') {
            count = Object.entries(counters)
              .filter(([k]) => ['electronics', 'eletronics'].includes(k.toLowerCase()))
              .reduce((sum, [, v]) => sum + Math.max(0, v), 0);
          } else {
            const entry = Object.entries(counters).find(
              ([k]) => k.toLowerCase() === categoryFilter.toLowerCase()
            );
            count = entry ? Math.max(0, entry[1]) : 0;
          }
        } else {
          count = Object.values(counters).reduce((sum, v) => sum + Math.max(0, v), 0);
        }

        if (count <= 0) continue;

        const centerLat = (bounds.northEast.lat + bounds.southWest.lat) / 2;
        const centerLng = (bounds.northEast.lng + bounds.southWest.lng) / 2;

        // Skip regions outside viewport (supports antimeridian wrapping),
        // except at max zoom-out where we want every counter globally.
        if (!showAllCounters) {
          const regionBounds = {
            north: bounds.northEast.lat,
            south: bounds.southWest.lat,
            east: bounds.northEast.lng,
            west: bounds.southWest.lng,
          };
          if (!boundsIntersect(viewBounds, regionBounds)) continue;
        }

        bubbles.push({
          lat: centerLat, lng: centerLng, count,
          swLat: bounds.southWest.lat, swLng: bounds.southWest.lng,
          neLat: bounds.northEast.lat, neLng: bounds.northEast.lng,
          regionCount: 1,
        });
      }

      // Merge bubbles that are too close on screen
      const MIN_PX_DIST = 80;
      let merged = true;
      while (merged) {
        merged = false;
        const next: Bubble[] = [];
        const used = new Set<number>();
        for (let i = 0; i < bubbles.length; i++) {
          if (used.has(i)) continue;
          let cur = { ...bubbles[i] };
          for (let j = i + 1; j < bubbles.length; j++) {
            if (used.has(j)) continue;
            const dist = latlngDistPx(cur.lat, cur.lng, bubbles[j].lat, bubbles[j].lng, zoom);
            if (dist < MIN_PX_DIST) {
              const total = cur.count + bubbles[j].count;
              cur = {
                lat: (cur.lat * cur.count + bubbles[j].lat * bubbles[j].count) / total,
                lng: (cur.lng * cur.count + bubbles[j].lng * bubbles[j].count) / total,
                count: total,
                swLat: Math.min(cur.swLat, bubbles[j].swLat),
                swLng: Math.min(cur.swLng, bubbles[j].swLng),
                neLat: Math.max(cur.neLat, bubbles[j].neLat),
                neLng: Math.max(cur.neLng, bubbles[j].neLng),
                regionCount: cur.regionCount + bubbles[j].regionCount,
              };
              used.add(j);
              merged = true;
            }
          }
          next.push(cur);
        }
        bubbles = next;
      }

      // Rebuild bubble markers only when in bubble mode
      bubbleMarkersRef.current.forEach((m) => m.setMap(null));
      const nextBubbleMarkers: google.maps.Marker[] = [];

      for (const bub of bubbles) {
        const logCount = Math.log10(bub.count + 1);
        const size = Math.min(72, Math.max(36, 32 + logCount * 16));
        const fontSize = size > 54 ? 16 : size > 42 ? 14 : 12;
        const label = bub.count >= 1000 ? `${(bub.count / 1000).toFixed(1)}k` : bub.count.toString();

        const marker = new google.maps.Marker({
          position: { lat: bub.lat, lng: bub.lng },
          map,
          icon: bubbleIcon(size, label, fontSize),
          zIndex: 10,
          optimized: true,
        });

        const fitBounds = { south: bub.swLat, west: bub.swLng, north: bub.neLat, east: bub.neLng };
        const isLeafBubble = bub.regionCount === 1;
        marker.addListener('click', () => {
          if (isLeafBubble) {
            // Leaf (single-region) bubble: skip the intermediate fitBounds step
            // and go straight to the dots view, centered on the region.
            map.panTo({ lat: bub.lat, lng: bub.lng });
            map.setZoom(DOT_ZOOM_THRESHOLD);
          } else {
            map.fitBounds(fitBounds, 40);
          }
        });
        nextBubbleMarkers.push(marker);
      }
      bubbleMarkersRef.current = nextBubbleMarkers;
    } else {
      // Hide bubbles in dot/pin modes
      bubbleMarkersRef.current.forEach((m) => m.setMap(null));
      bubbleMarkersRef.current = [];

      const mode: 'dot' | 'pin' = zoom < PIN_ZOOM_THRESHOLD ? 'dot' : 'pin';
      if (renderModeRef.current !== mode) {
        postMarkersRef.current.forEach((m) => m.setMap(null));
        postMarkersRef.current.clear();
        renderModeRef.current = mode;
      }

      // Hide posts whose partner location is being rendered — the partner
      // pin already represents them. Without this, the post pin draws on
      // top of the partner pin at the same lat/lng (most partner posts
      // share the partner's exact coordinates) and the partner is invisible.
      const postsForLayer = posts.filter(
        (p) => !p.partnerLocationId || !renderedPartnerIds.has(p.partnerLocationId)
      );

      const visiblePosts = mode === 'pin'
        ? (postsForLayer.length > MAX_INDIVIDUAL_MARKERS ? postsForLayer.slice(0, MAX_INDIVIDUAL_MARKERS) : postsForLayer)
        : postsForLayer;

      const desiredIds = new Set(visiblePosts.map((p) => p.id));
      for (const [id, marker] of postMarkersRef.current) {
        if (!desiredIds.has(id)) {
          marker.setMap(null);
          postMarkersRef.current.delete(id);
        }
      }

      for (const post of visiblePosts) {
        const isSelected = post.id === selectedPostId;
        let marker = postMarkersRef.current.get(post.id);

        if (!marker) {
          marker = new google.maps.Marker({
            position: { lat: post.latitude, lng: post.longitude },
            map,
            zIndex: isSelected ? 20 : 10,
            optimized: true,
          });

          if (mode === 'dot') {
            marker.addListener('click', () => {
              map.panTo({ lat: post.latitude, lng: post.longitude });
              map.setZoom(PIN_ZOOM_THRESHOLD);
            });
          } else {
            marker.addListener('click', () => {
              const screenPos = latLngToContainerPoint(map, post.latitude, post.longitude);
              onPostClickRef.current(post, screenPos);
            });
          }

          postMarkersRef.current.set(post.id, marker);
        }

        const pos = marker.getPosition();
        if (!pos || pos.lat() !== post.latitude || pos.lng() !== post.longitude) {
          marker.setPosition({ lat: post.latitude, lng: post.longitude });
        }

        const nextSig = mode === 'dot'
          ? `dot|${post.isPromoted ? 1 : 0}|${post.type}|${isSelected ? 1 : 0}`
          : `pin|${post.category}|${post.type}|${post.isPromoted ? 1 : 0}|${isSelected ? 1 : 0}`;
        const prevSig = (marker as google.maps.Marker & { __sig?: string }).__sig;

        if (prevSig !== nextSig) {
          if (mode === 'dot') {
            const color = post.isPromoted ? '#FFD700' : post.type === 'Lost' ? '#FF5449' : '#009DE0';
            const size = isSelected ? 13 : 10;
            marker.setIcon(dotIcon(color, size, post.isPromoted ? 'promoted' : 'regular'));
          } else {
            const sz = isSelected ? 48 : 38;
            marker.setIcon(pinIcon(getPinIcon(post.category, post.type, post.isPromoted), sz));
          }
          marker.setZIndex(isSelected ? 20 : 10);
          (marker as google.maps.Marker & { __sig?: string }).__sig = nextSig;
        }

        if (!marker.getMap()) {
          marker.setMap(map);
        }
      }
    }
  }, [posts, regionCounters, categoryFilter, selectedPostId, zoom, ready, renderedPartnerIds]);

  // --- Partner markers ---
  //
  // Visibility rules (mirrors the RN map's normal mode):
  //   • Bubble / counter zoom (zoom < DOT_ZOOM_THRESHOLD) → no partner pins
  //     (matches RN's `longitudeDelta > 2.2` counters mode, which hides both
  //     post and partner markers).
  //   • DOT_ZOOM_THRESHOLD ≤ zoom < PIN_ZOOM_THRESHOLD → render each partner
  //     as a small circular dot containing the partner's profile photo
  //     (`partnerDotIcon`). Mirrors the RN `PartnerDotMarker` at intermediate
  //     zoom and matches the visual language of the post-dot layer.
  //   • zoom ≥ PIN_ZOOM_THRESHOLD → render each partner as a full teardrop
  //     pin with the photo embedded in the head (`partnerIcon`).
  // Posts attached to a rendered partner are excluded from the post layer
  // above so the partner marker owns the lat/lng without a post marker on top.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const partnerMode: 'dot' | 'pin' = zoom >= PIN_ZOOM_THRESHOLD ? 'pin' : 'dot';
    const modeChanged = partnerModeRef.current !== partnerMode;
    partnerModeRef.current = partnerMode;

    const buildIcon = (logo: string | null) =>
      partnerMode === 'pin' ? partnerIcon(logo) : partnerDotIcon(logo);

    const visiblePartners = partners.filter((p) => renderedPartnerIds.has(p.id));

    const desiredIds = new Set(visiblePartners.map((p) => p.id));
    for (const [id, marker] of partnerMarkersRef.current) {
      if (!desiredIds.has(id)) {
        marker.setMap(null);
        partnerMarkersRef.current.delete(id);
      }
    }

    for (const partner of visiblePartners) {
      let marker = partnerMarkersRef.current.get(partner.id);
      // Read the cache synchronously so a marker re-creation after pan/zoom
      // doesn't briefly flash the plain pin if we already fetched the logo.
      const cachedLogo = partner.logoUrl
        ? logoDataUrlCache.get(partner.logoUrl) ?? null
        : null;

      if (!marker) {
        marker = new google.maps.Marker({
          position: { lat: partner.latitude, lng: partner.longitude },
          map,
          icon: buildIcon(cachedLogo),
          zIndex: 30,
          // optimized:false because we mutate the icon when the logo
          // fetch resolves and when the partner mode flips dot↔pin; with
          // optimized:true some renderers don't pick up the swap reliably.
          optimized: false,
        });

        marker.addListener('click', () => {
          // Close any open InfoWindow leftover from previous interactions,
          // then hand control to the partner-modal flow in MapView.
          infoWindowRef.current?.close();
          onPartnerClickRef.current?.(partner);
        });

        partnerMarkersRef.current.set(partner.id, marker);
      } else {
        const pos = marker.getPosition();
        if (!pos || pos.lat() !== partner.latitude || pos.lng() !== partner.longitude) {
          marker.setPosition({ lat: partner.latitude, lng: partner.longitude });
        }
        if (!marker.getMap()) {
          marker.setMap(map);
        }
        // If we crossed the dot↔pin threshold, re-skin in place (no
        // recreate, so the click listener and ref entry survive).
        if (modeChanged) {
          marker.setIcon(buildIcon(cachedLogo));
        }
      }

      // If we don't yet have the logo cached, fetch it and swap the
      // marker icon when it arrives. The marker reference is captured
      // in the closure so we can find this exact marker after the await.
      if (partner.logoUrl && !cachedLogo) {
        const url = partner.logoUrl;
        const partnerId = partner.id;
        fetchLogoAsDataUrl(url).then((dataUrl) => {
          if (!dataUrl) return;
          // Re-look-up the marker — by the time the fetch resolves it
          // may have been removed (panned out of view) or recreated.
          const current = partnerMarkersRef.current.get(partnerId);
          if (!current) return;
          // Use the CURRENT mode rather than the mode at fetch start —
          // the user may have zoomed across the threshold while waiting.
          const icon =
            partnerModeRef.current === 'pin'
              ? partnerIcon(dataUrl)
              : partnerDotIcon(dataUrl);
          current.setIcon(icon);
        });
      }
    }
  }, [partners, renderedPartnerIds, ready, zoom]);

  return <div ref={containerRef} className="w-full h-full md:rounded-2xl" />;
}
