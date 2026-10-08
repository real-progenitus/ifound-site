import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-guard';
import { getSharePost } from '@/lib/get-share-post';
import { createLogger } from '@/lib/logger';

const log = createLogger('share-image');

/**
 * Serves a post's share flyer JPEG from our own origin.
 *
 * The share page needs the image as a File to hand to `navigator.share({ files })`
 * — that is what puts the actual flyer (not just a link) into Instagram,
 * WhatsApp or Facebook from the phone's share sheet. Fetching it straight from
 * storage.googleapis.com would need CORS on the bucket; proxying it here avoids
 * that, and `?download=1` makes the same route the "Download image" link.
 *
 * GET /api/share-image/{postId}?format=feed|story[&env=qa][&download=1]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const blocked = await guardApiRequest(request, {
    name: 'share-image',
    requestsPerMinute: 60,
  });
  if (blocked) return blocked;

  const { postId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'story' ? 'story' : 'feed';
  const isQA = searchParams.get('env') === 'qa';
  const download = searchParams.get('download') === '1';

  try {
    const post = await getSharePost(postId, isQA);
    const source = format === 'story' ? post?.storyUrl : post?.feedUrl;
    if (!post || !source || post.isResolved || post.isExpired) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const upstream = await fetch(source);
    if (!upstream.ok || !upstream.body) {
      log.warn('Upstream flyer fetch failed', { postId, status: upstream.status });
      return NextResponse.json(
        { error: 'Unavailable' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'image/jpeg',
      // The source URL is versioned (?v=generatedAt), so a re-render changes
      // what this route returns within the s-maxage window at worst.
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    };
    if (download) {
      headers['Content-Disposition'] = `attachment; filename="ifound-flyer-${format}.jpg"`;
    }
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    log.error('Failed to serve share image', error, { postId });
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
