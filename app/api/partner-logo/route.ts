import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('partner-logo');

/**
 * Same-origin proxy for partner logo images stored in Firebase Storage.
 *
 * Why this exists:
 *   The partner pin on the map is a Google Maps Marker, whose icon is an
 *   SVG data URI. SVGs loaded as Marker icons are sandboxed by the browser
 *   and CANNOT make network requests for embedded `<image href="https://...">`
 *   resources — they can only render inline data: URIs. So the client must
 *   pre-fetch each logo as base64 and inline it into the SVG.
 *
 *   Pre-fetching directly from Firebase Storage would normally fail too:
 *   `https://firebasestorage.googleapis.com/.../o/...?alt=media&token=...`
 *   responses do NOT include `Access-Control-Allow-Origin` on the actual
 *   GET (only on the OPTIONS preflight), so a browser `fetch()` with
 *   `mode: 'cors'` is rejected.
 *
 *   This endpoint sidesteps both problems: the browser fetches a same-origin
 *   URL (no CORS), Next.js fetches Firebase Storage server-side (no
 *   browser sandbox), and the response is streamed back as the original
 *   image bytes.
 *
 * SSRF defense:
 *   The URL must point to `firebasestorage.googleapis.com`. Anything else
 *   is rejected with 400. This prevents an attacker from coaxing our server
 *   into fetching arbitrary internal URLs (cloud metadata, intranet, etc.).
 */

const ALLOWED_HOST = 'firebasestorage.googleapis.com';
// Logos in our app are typically <50KB. Cap aggressively to avoid being a
// general-purpose image proxy and to keep the resulting base64 SVG icon
// small enough for browsers to render cheaply.
const MAX_BYTES = 1024 * 1024;

export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'partner-logo',
    // Higher budget than the map data endpoints: a single map view can
    // render 20+ partners, each triggering one proxy hit on first load.
    // The CDN cache (below) absorbs everything after that.
    requestsPerMinute: 120,
  });
  if (blocked) return blocked;

  const target = request.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json(
      { error: 'URL host not allowed' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      // Server-side fetch — CORS does not apply here.
      cache: 'force-cache',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream fetch failed' },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Upstream is not an image' },
        { status: 415 }
      );
    }

    // We need to inspect size before forwarding so we don't accidentally
    // proxy multi-megabyte payloads. Buffer the whole response.
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Logo too large' },
        { status: 413 }
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        // Logos are immutable per Firebase Storage path/token. Cache
        // aggressively at the edge so the average map view triggers zero
        // origin fetches after warm-up.
        'Cache-Control':
          'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    log.error('failed to proxy partner logo', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo' },
      { status: 502 }
    );
  }
}
