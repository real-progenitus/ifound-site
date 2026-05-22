import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';
import { uploadImage, saveSubmission } from '@/lib/submissions';

/**
 * POST /api/partner-submit
 *
 * Receives a multipart/form-data submission from `/[locale]/partner-submit`
 * with the following fields:
 *   - title         (required, ≤200 chars)
 *   - description   (required, ≤5000 chars)
 *   - category      (required, one of CATEGORY_ALLOWLIST)
 *   - locale        (optional, ≤10 chars — informational only)
 *   - images        (1..3 File entries, each image/*, ≤8 MB, total ≤20 MB)
 *
 * Images are uploaded to Vercel Blob; metadata is persisted to Upstash Redis.
 * Both services are already used by this project (rate limiting uses Redis).
 * Deliberately decoupled from lib/firebase-admin.ts.
 */

export const runtime = 'nodejs';
// File uploads can take a few seconds. Default route is fine, but make the
// dynamic-ness explicit so Next never tries to statically optimise this.
export const dynamic = 'force-dynamic';

const log = createLogger('partner-submit');

// Must stay in sync with the `map.categories` keys in messages/en.json. The
// client dropdown sources its labels from there; this is the canonical
// allowlist for server validation.
const CATEGORY_ALLOWLIST = new Set([
  'other',
  'electronics',
  'phones',
  'glasses',
  'keys',
  'pets',
  'persons',
  'clothes',
  'vehicles',
  'wallets',
]);

const LIMITS = {
  title: 200,
  description: 5000,
  partnerName: 100,
  locale: 10,
  maxImages: 3,
  perImageBytes: 1 * 1024 * 1024,  // 1 MB — client compresses before upload
  totalImageBytes: 3 * 1024 * 1024, // 3 MB combined
} as const;

type ErrorCode = 'invalid_input' | 'upload_failed' | 'save_failed';

interface SubmitResult {
  success: boolean;
  error?: string;
  code?: ErrorCode;
}

function badRequest(reason: string, code: ErrorCode = 'invalid_input'): NextResponse {
  return NextResponse.json<SubmitResult>(
    { success: false, error: reason, code },
    { status: 400, headers: { 'Cache-Control': 'no-store' } }
  );
}

function readString(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== 'string') return null;
  return v;
}

/**
 * Sanitise a filename so it's safe to place in Drive metadata. Strip control
 * chars and path separators; cap length. We don't try to preserve the user's
 * exact filename — we only need something human-readable in the Drive view.
 */
function safeFilename(name: string, fallback: string): string {
  const cleaned = name
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\\/]/g, '_')
    .trim();
  const out = cleaned.length > 0 ? cleaned : fallback;
  return out.slice(0, 120);
}

export async function POST(request: NextRequest) {
  // 1. Origin allowlist + per-IP / per-UA rate limit. Mutating endpoint with
  //    file uploads — keep the budget tight so an attacker can't burn Drive
  //    quota by spamming submissions.
  const blocked = await guardApiRequest(request, {
    name: 'partner-submit',
    requestsPerMinute: 5,
  });
  if (blocked) return blocked;

  // 2. Parse multipart body. `request.formData()` enforces some structural
  //    sanity already; everything beyond that is on us.
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    log.warn('failed to parse multipart body', {
      message: err instanceof Error ? err.message : String(err),
    });
    return badRequest('Invalid form data.');
  }

  // 3. Validate text fields.
  const rawTitle = readString(form, 'title');
  const rawDescription = readString(form, 'description');
  const rawCategory = readString(form, 'category');
  const rawLocale = readString(form, 'locale');

  if (!rawTitle) return badRequest('Title is required.');
  if (!rawDescription) return badRequest('Description is required.');
  if (!rawCategory) return badRequest('Category is required.');

  const rawPartnerName = readString(form, 'partnerName');

  const title = rawTitle.trim();
  const description = rawDescription.trim();
  const category = rawCategory.trim().toLowerCase();
  const locale = (rawLocale ?? '').trim().slice(0, LIMITS.locale);
  const partnerName = (rawPartnerName ?? '').trim().slice(0, LIMITS.partnerName);

  if (title.length === 0) return badRequest('Title is required.');
  if (description.length === 0) return badRequest('Description is required.');
  if (title.length > LIMITS.title) {
    return badRequest(`Title exceeds the ${LIMITS.title}-character limit.`);
  }
  if (description.length > LIMITS.description) {
    return badRequest(
      `Description exceeds the ${LIMITS.description}-character limit.`
    );
  }
  if (!CATEGORY_ALLOWLIST.has(category)) {
    return badRequest('Invalid category.');
  }

  // 4. Collect and validate images.
  const rawImages = form.getAll('images');
  const images: File[] = [];
  for (const entry of rawImages) {
    // Skip stray empty form parts some browsers send for empty file inputs.
    if (typeof entry === 'string') continue;
    if (entry.size === 0) continue;
    images.push(entry);
  }

  if (images.length === 0) {
    return badRequest('At least one image is required.');
  }
  if (images.length > LIMITS.maxImages) {
    return badRequest(`At most ${LIMITS.maxImages} images are allowed.`);
  }

  let totalBytes = 0;
  for (const file of images) {
    if (!file.type || !file.type.startsWith('image/')) {
      return badRequest('Only image files are allowed.');
    }
    if (file.size > LIMITS.perImageBytes) {
      return badRequest(
        `Each image must be ${LIMITS.perImageBytes / (1024 * 1024)} MB or smaller.`
      );
    }
    totalBytes += file.size;
  }
  if (totalBytes > LIMITS.totalImageBytes) {
    return badRequest(
      `Combined image size must be ${LIMITS.totalImageBytes / (1024 * 1024)} MB or smaller.`
    );
  }

  // Upload images to Vercel Blob
  const ts = Date.now();
  const imageUrls: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = safeFilename(
      file.name,
      `partner-submit-${new Date(ts).toISOString()}-${i + 1}`
    );
    try {
      const url = await uploadImage({ buffer, mimeType: file.type, filename });
      imageUrls.push(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('blob upload failed', { index: i, message: msg });
      return NextResponse.json<SubmitResult>(
        {
          success: false,
          error: 'Failed to upload images. Please try again later.',
          code: 'upload_failed',
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  // Save metadata to Redis
  try {
    await saveSubmission({
      title,
      description,
      category,
      locale,
      partnerName,
      images: imageUrls,
      createdAt: ts,
    });
  } catch (err) {
    log.error('redis save failed', err);
    return NextResponse.json<SubmitResult>(
      {
        success: false,
        error: 'Failed to save submission. Please try again later.',
        code: 'save_failed',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json<SubmitResult>(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
