'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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

function dotIcon(color: string, size: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeOpacity: 1,
    strokeWeight: 2,
    scale: size / 2,
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

function partnerIcon(logoUrl: string | null): google.maps.Icon {
  const inner = logoUrl
    ? `<image href="${logoUrl}" x="4" y="4" width="28" height="28" clip-path="circle(14px at 14px 14px)"/>`
    : `<circle cx="18" cy="18" r="10" fill="white" opacity="0.7"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <circle cx="18" cy="18" r="17" fill="${logoUrl ? 'white' : '#009DE0'}" stroke="#009DE0" stroke-width="2"/>
    ${inner}
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
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
  onBoundsChange,
  onZoomChange,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const bubbleMarkersRef = useRef<google.maps.Marker[]>([]);
  const postMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const partnerMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const renderModeRef = useRef<'bubble' | 'dot' | 'pin'>('bubble');
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onPostClickRef = useRef(onPostClick);
  const [zoom, setZoom] = useState(6);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPostClickRef.current = onPostClick;
  }, [onPostClick]);

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
        marker.addListener('click', () => map.fitBounds(fitBounds, 40));
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

      const visiblePosts = mode === 'pin'
        ? (posts.length > MAX_INDIVIDUAL_MARKERS ? posts.slice(0, MAX_INDIVIDUAL_MARKERS) : posts)
        : posts;

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
            const color = post.isPromoted ? '#FFD700' : post.type === 'Lost' ? '#F97316' : '#009DE0';
            const size = isSelected ? 18 : 14;
            marker.setIcon(dotIcon(color, size));
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
  }, [posts, regionCounters, categoryFilter, selectedPostId, zoom, ready]);

  // --- Partner markers (independent from posts to avoid flicker) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const desiredIds = new Set(partners.map((p) => p.id));
    for (const [id, marker] of partnerMarkersRef.current) {
      if (!desiredIds.has(id)) {
        marker.setMap(null);
        partnerMarkersRef.current.delete(id);
      }
    }

    for (const partner of partners) {
      let marker = partnerMarkersRef.current.get(partner.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: { lat: partner.latitude, lng: partner.longitude },
          map,
          icon: partnerIcon(partner.logoUrl),
          zIndex: 30,
          optimized: true,
        });

        marker.addListener('click', () => {
          if (!infoWindowRef.current) return;
          infoWindowRef.current.setContent(
            `<div style="font-family:Roboto,sans-serif;min-width:150px;">
              <strong style="color:#3A3B3E;">${partner.title}</strong>
              ${partner.contact ? `<br/><span style="color:#555;font-size:12px;">📞 ${partner.contact}</span>` : ''}
            </div>`
          );
          infoWindowRef.current.open(map, marker);
        });

        partnerMarkersRef.current.set(partner.id, marker);
      } else {
        const pos = marker.getPosition();
        if (!pos || pos.lat() !== partner.latitude || pos.lng() !== partner.longitude) {
          marker.setPosition({ lat: partner.latitude, lng: partner.longitude });
        }
      }
    }
  }, [partners, ready]);

  return <div ref={containerRef} className="w-full h-full md:rounded-2xl" />;
}
