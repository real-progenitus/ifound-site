import type { MapPost } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('post-cache');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  posts: MapPost[];
  fetchedAt: number;
}

// Module-level singleton — survives re-renders, cleared on full page refresh
const cache = new Map<string, CacheEntry>();

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileDescriptor {
  key: string;
  bounds: Bounds;
}

/**
 * Pick a grid cell size so the viewport always maps to roughly 2–3 tiles per axis.
 * Snaps to standard step values so neighbouring views share the same keys.
 */
function getGridSize(latSpan: number, lngSpan: number): number {
  const span = Math.max(latSpan, lngSpan);
  const rawSize = span / 2;
  const steps = [0.25, 0.5, 1, 2, 5, 10, 20, 45];
  return steps.find((s) => s >= rawSize) ?? 45;
}

function snap(value: number, gridSize: number, mode: 'floor' | 'ceil'): number {
  const rounded = mode === 'floor'
    ? Math.floor(value / gridSize) * gridSize
    : Math.ceil(value / gridSize) * gridSize;
  // Round to 4 decimal places to avoid floating-point key mismatches
  return Math.round(rounded * 10000) / 10000;
}

/**
 * Decompose a viewport into a set of fixed grid tiles.
 */
export function getTileDescriptors(bounds: Bounds): TileDescriptor[] {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const gridSize = getGridSize(latSpan, lngSpan);

  const snappedSouth = snap(bounds.south, gridSize, 'floor');
  const snappedWest  = snap(bounds.west,  gridSize, 'floor');
  const snappedNorth = snap(bounds.north, gridSize, 'ceil');
  const snappedEast  = snap(bounds.east,  gridSize, 'ceil');

  const tiles: TileDescriptor[] = [];

  for (let lat = snappedSouth; lat < snappedNorth - 0.0001; lat = Math.round((lat + gridSize) * 10000) / 10000) {
    for (let lng = snappedWest; lng < snappedEast - 0.0001; lng = Math.round((lng + gridSize) * 10000) / 10000) {
      const s = Math.round(lat * 10000) / 10000;
      const w = Math.round(lng * 10000) / 10000;
      const n = Math.round((lat + gridSize) * 10000) / 10000;
      const e = Math.round((lng + gridSize) * 10000) / 10000;
      tiles.push({
        key: `${s},${w},${n},${e}`,
        bounds: { south: s, west: w, north: n, east: e },
      });
    }
  }

  return tiles;
}

/**
 * Returns fresh cached posts for all tiles that cover `bounds`,
 * and the list of tiles that are missing or expired (need fetching).
 * Stale tiles are included in `missingTiles` but their old data is
 * still returned so the UI can show something while re-fetching.
 */
export function getCachedPosts(bounds: Bounds): {
  posts: MapPost[];
  missingTiles: TileDescriptor[];
} {
  const tiles = getTileDescriptors(bounds);
  const now = Date.now();
  const postMap = new Map<string, MapPost>();
  const missingTiles: TileDescriptor[] = [];

  for (const tile of tiles) {
    const entry = cache.get(tile.key);
    if (entry) {
      const ageS = Math.round((now - entry.fetchedAt) / 1000);
      const fresh = now - entry.fetchedAt < CACHE_TTL;
      log.debug(fresh ? 'tile hit' : 'tile stale', {
        tile: tile.key,
        ageSeconds: ageS,
        posts: entry.posts.length,
      });
      // Always merge stale data so the list isn't empty while re-fetching
      entry.posts.forEach((p) => postMap.set(p.id, p));
      if (!fresh) missingTiles.push(tile);
    } else {
      log.debug('tile miss', { tile: tile.key });
      missingTiles.push(tile);
    }
  }

  return { posts: Array.from(postMap.values()), missingTiles };
}

/**
 * Store the posts for a given tile key.
 */
export function setCacheTile(tileKey: string, posts: MapPost[]): void {
  cache.set(tileKey, { posts, fetchedAt: Date.now() });
  log.debug('tile stored', { tile: tileKey, posts: posts.length });
}

/**
 * Merge all currently cached tiles that cover `bounds` (including stale ones).
 * Call this after writing new tiles to get the final merged result.
 */
export function getMergedCachedPosts(bounds: Bounds): MapPost[] {
  const tiles = getTileDescriptors(bounds);
  const postMap = new Map<string, MapPost>();
  for (const tile of tiles) {
    const entry = cache.get(tile.key);
    if (entry) entry.posts.forEach((p) => postMap.set(p.id, p));
  }
  return Array.from(postMap.values());
}
