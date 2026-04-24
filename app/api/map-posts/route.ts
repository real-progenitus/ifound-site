import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('map-posts');


// Cache posts in memory for 5 minutes to avoid hammering Firestore.
// The cache holds the already-filtered, already-transformed working set
// (non-deleted, non-resolved, last 60 days). Bounds filtering happens per
// request on top of this cached set.
let cachedPosts: NonNullable<ReturnType<typeof transformDoc>>[] | null = null;
let cacheTime = 0;
let inflight: Promise<NonNullable<ReturnType<typeof transformDoc>>[]> | null = null;
const CACHE_TTL = 5 * 60 * 1000;
const WINDOW_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
// Safety cap in case the active window grows unexpectedly. With Firestore-side
// filters this should never be reached in practice; if it ever is, we want to
// know rather than silently truncate forever.
const SAFETY_LIMIT = 10000;

function transformDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const d = doc.data();
  if (d.accountWasDeleted === true) return null;
  const lat = d.pinLocation?.latitude;
  const lng = d.pinLocation?.longitude;
  if (lat == null || lng == null) return null;
  let ts = 0;
  if (d.timestamp && typeof d.timestamp.toMillis === 'function') {
    ts = d.timestamp.toMillis();
  } else if (typeof d.timestamp === 'number') {
    ts = d.timestamp;
  }
  return {
    id: doc.id,
    title: d.title ?? '',
    description: d.description ?? '',
    category: d.category ?? '',
    type: d.type ?? '',
    address: d.address ?? '',
    reward: d.reward ?? '',
    currency: d.currency ?? 'EUR',
    images: d.images ?? [],
    timestamp: ts,
    isResolved: d.isResolved ?? false,
    isPromoted: d.promotion?.tier === 'max_exposure' && d.promotion?.status === 'active',
    latitude: lat as number,
    longitude: lng as number,
  };
}

async function fetchActivePosts(): Promise<NonNullable<ReturnType<typeof transformDoc>>[]> {
  // `timestamp` is stored as int64 milliseconds (not a Firestore Timestamp)
  // in the Posts collection. Use a plain number so Firestore compares
  // like-for-like; mixed-type comparisons silently return zero results.
  const cutoff = Date.now() - WINDOW_MS;

  // Push all coarse filters into Firestore so we pay for rows we actually
  // need. Requires a composite index on Posts:
  //   isDeleted ASC, isResolved ASC, timestamp DESC
  // Firestore will print a console link the first time this query runs
  // without the index; follow it to create the index.
  const snapshot = await db()
    .collection('Posts')
    .where('isDeleted', '==', false)
    .where('isResolved', '==', false)
    .where('timestamp', '>=', cutoff)
    .orderBy('timestamp', 'desc')
    .limit(SAFETY_LIMIT)
    .get();

  if (snapshot.size >= SAFETY_LIMIT) {
    log.warn('safety limit hit; active window larger than expected', {
      limit: SAFETY_LIMIT,
    });
  }

  return snapshot.docs
    .map(transformDoc)
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

export async function GET(request: NextRequest) {
  // Map-posts is called repeatedly as the user pans/zooms, so we allow
  // a higher per-minute budget than the other endpoints.
  const blocked = await guardApiRequest(request, {
    name: 'map-posts',
    requestsPerMinute: 120,
  });
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  // Parse + validate viewport bounds. Any non-finite input falls back to the
  // full world extent, and everything is clamped to valid lat/lng ranges so a
  // caller cannot craft nonsensical viewports (e.g. to force cache misses or
  // probe behavior with out-of-range values).
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const parseBound = (key: string, fallback: number, min: number, max: number) => {
    const raw = searchParams.get(key);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
  };
  const north = parseBound('north', 90, -90, 90);
  const south = parseBound('south', -90, -90, 90);
  const east = parseBound('east', 180, -180, 180);
  const west = parseBound('west', -180, -180, 180);

  try {
    const now = Date.now();

    if (!cachedPosts || now - cacheTime > CACHE_TTL) {
      // Single-flight: concurrent cold-cache requests share one Firestore
      // read instead of each issuing their own.
      if (!inflight) {
        inflight = fetchActivePosts()
          .then((posts) => {
            cachedPosts = posts;
            cacheTime = Date.now();
            return posts;
          })
          .finally(() => {
            inflight = null;
          });
      }
      await inflight;
    }

    const posts = (cachedPosts ?? []).filter(
      (p) => p.latitude >= south && p.latitude <= north && p.longitude >= west && p.longitude <= east
    );

    return NextResponse.json(posts, {
      headers: {
        // Browser: 60s. CDN (Vercel edge): 5 min with 60s stale-while-revalidate.
        // This makes the CDN absorb bursts of identical requests before they
        // reach Firestore.
        'Cache-Control':
          'public, max-age=60, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    log.error('failed to fetch map posts', error);
    return NextResponse.json([], { status: 500 });
  }
}
