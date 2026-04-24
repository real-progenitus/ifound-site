'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPost, PartnerLocation, RegionCounter, getCategoryIcon, getPinIcon } from './types';

interface LeafletMapProps {
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
const MIN_REGION_PX_SIZE = 10;

export default function LeafletMap({ posts, partners, regionCounters, categoryFilter, selectedPostId, flyTo, onPostClick, onBoundsChange, onZoomChange }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const initialBoundsEmitted = useRef(false);
  const [zoom, setZoom] = useState(6);

  // Fly to location when requested
  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 1.5 });
    }
  }, [flyTo]);

  const emitBounds = useCallback(() => {
    if (!mapRef.current) return;
    const b = mapRef.current.getBounds();
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onBoundsChange]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [38.7, -9.14],
      zoom: 6,
      zoomControl: false,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, NGA',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersRef.current.addTo(map);

    map.on('moveend', () => {
      const z = map.getZoom();
      setZoom(z);
      onZoomChange?.(z);
      if (z >= DOT_ZOOM_THRESHOLD) {
        emitBounds();
      }
    });

    mapRef.current = map;

    // Emit initial bounds after map is ready (only if already zoomed in enough)
    setTimeout(() => {
      if (!initialBoundsEmitted.current) {
        initialBoundsEmitted.current = true;
        if (mapRef.current && mapRef.current.getZoom() >= DOT_ZOOM_THRESHOLD) {
          emitBounds();
        }
      }
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [emitBounds]);

  // Render markers when posts/partners/selection change
  useEffect(() => {
    if (!mapRef.current) return;
    const group = markersRef.current;
    group.clearLayers();

    const map = mapRef.current;
    const isClusterView = zoom < DOT_ZOOM_THRESHOLD;

    if (isClusterView) {
      // Show region counter bubbles from Firebase
      const mapBounds = map.getBounds();

      // Build visible bubbles with their screen positions
      interface Bubble { lat: number; lng: number; count: number; regionBounds: L.LatLngBounds }
      let bubbles: Bubble[] = [];

      for (const region of regionCounters) {
        const { bounds, counters } = region;

        // Compute count: if category filter active, use only that category
        let count: number;
        if (categoryFilter) {
          if (categoryFilter === 'Electronics') {
            // Match all electronics-related keys
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

        const regionBounds = L.latLngBounds(
          [bounds.southWest.lat, bounds.southWest.lng],
          [bounds.northEast.lat, bounds.northEast.lng]
        );
        if (!mapBounds.intersects(regionBounds)) continue;

        // Hide tiny regions
        const nePx = map.latLngToContainerPoint([bounds.northEast.lat, bounds.northEast.lng]);
        const swPx = map.latLngToContainerPoint([bounds.southWest.lat, bounds.southWest.lng]);
        if (Math.max(Math.abs(nePx.x - swPx.x), Math.abs(nePx.y - swPx.y)) < MIN_REGION_PX_SIZE) continue;

        bubbles.push({ lat: centerLat, lng: centerLng, count, regionBounds });
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
          const pxA = map.latLngToContainerPoint([cur.lat, cur.lng]);
          for (let j = i + 1; j < bubbles.length; j++) {
            if (used.has(j)) continue;
            const pxB = map.latLngToContainerPoint([bubbles[j].lat, bubbles[j].lng]);
            const dist = Math.sqrt((pxA.x - pxB.x) ** 2 + (pxA.y - pxB.y) ** 2);
            if (dist < MIN_PX_DIST) {
              const total = cur.count + bubbles[j].count;
              cur = {
                lat: (cur.lat * cur.count + bubbles[j].lat * bubbles[j].count) / total,
                lng: (cur.lng * cur.count + bubbles[j].lng * bubbles[j].count) / total,
                count: total,
                regionBounds: cur.regionBounds.extend(bubbles[j].regionBounds),
              };
              used.add(j);
              merged = true;
            }
          }
          next.push(cur);
        }
        bubbles = next;
      }

      // Render bubbles
      for (const b of bubbles) {
        const logCount = Math.log10(b.count + 1);
        const size = Math.min(72, Math.max(36, 32 + logCount * 16));
        const fontSize = size > 54 ? 16 : size > 42 ? 14 : 12;
        const label = b.count >= 1000 ? `${(b.count / 1000).toFixed(1)}k` : b.count.toString();

        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #F4A261, #E76F51, #C1440E);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fontSize}px;font-family:Roboto,sans-serif;">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: '',
        });

        const marker = L.marker([b.lat, b.lng], { icon });
        const fitBounds = b.regionBounds;
        marker.on('click', () => {
          map.fitBounds(fitBounds, { padding: [40, 40] });
        });
        group.addLayer(marker);
      }
    } else if (zoom < PIN_ZOOM_THRESHOLD) {
      // Dot view — red for Lost, blue for Found, white border
      if (posts.length > 0) {
        for (const post of posts) {
          const color = post.isPromoted ? '#FFD700' : post.type === 'Lost' ? '#F97316' : '#009DE0';
          const isSelected = post.id === selectedPostId;
          const dotSize = isSelected ? 16 : 12;
          const icon = L.divIcon({
            html: `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};border:2px solid white;"></div>`,
            iconSize: [dotSize, dotSize],
            iconAnchor: [dotSize / 2, dotSize / 2],
            className: '',
          });
          const marker = L.marker([post.latitude, post.longitude], { icon });
          marker.on('click', () => {
            map.flyTo([post.latitude, post.longitude], PIN_ZOOM_THRESHOLD, { duration: 1 });
          });
          group.addLayer(marker);
        }
      }
    } else {
      // Full pin markers with category icons
      if (posts.length > 0) {
        const visiblePosts = posts.length > MAX_INDIVIDUAL_MARKERS
          ? posts.slice(0, MAX_INDIVIDUAL_MARKERS)
          : posts;
        for (const post of visiblePosts) {
          const isSelected = post.id === selectedPostId;
          const pinUrl = getPinIcon(post.category, post.type, post.isPromoted);
          const sz = isSelected ? 48 : 38;
          const icon = L.icon({
            iconUrl: pinUrl,
            iconSize: [sz, sz],
            iconAnchor: [sz / 2, sz],
          });
          const marker = L.marker([post.latitude, post.longitude], { icon });
          marker.on('click', () => {
            const pt = map.latLngToContainerPoint([post.latitude, post.longitude]);
            onPostClick(post, { x: pt.x, y: pt.y });
          });
          group.addLayer(marker);
        }
      }
    }

    // Show partner locations
    for (const partner of partners) {
      const iconHtml = partner.logoUrl
        ? `<div style="width:36px;height:36px;border-radius:50%;border:2px solid #009DE0;overflow:hidden;background:white;display:flex;align-items:center;justify-content:center;">
            <img src="${partner.logoUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;" />
           </div>`
        : `<div style="width:36px;height:36px;border-radius:50%;border:2px solid #009DE0;background:#009DE0;display:flex;align-items:center;justify-content:center;">
            <img src="/markers/partner.svg" style="width:24px;height:24px;" />
           </div>`;

      const icon = L.divIcon({
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      });
      const marker = L.marker([partner.latitude, partner.longitude], { icon });
      marker.bindPopup(
        `<div style="font-family:Roboto,sans-serif;min-width:150px;">
          <strong style="color:#3A3B3E;">${partner.title}</strong>
          ${partner.contact ? `<br/><span style="color:#555;font-size:12px;">📞 ${partner.contact}</span>` : ''}
        </div>`
      );
      group.addLayer(marker);
    }
  }, [posts, partners, regionCounters, categoryFilter, selectedPostId, onPostClick, zoom]);

  return (
    <>
      <style jsx global>{`
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .cluster-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          font-family: Roboto, sans-serif !important;
        }
        .cluster-tooltip::before {
          display: none !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}
