import 'server-only';
import { put } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logger';

/**
 * Server-only submission storage backed by:
 *   - Vercel Blob: image files
 *   - Upstash Redis: submission metadata (already used for rate limiting)
 *
 * Required env vars:
 *   BLOB_READ_WRITE_TOKEN   — from Vercel dashboard → Storage → Blob
 *   UPSTASH_REDIS_REST_URL  — already set for rate limiting
 *   UPSTASH_REDIS_REST_TOKEN — already set for rate limiting
 *
 * Redis schema:
 *   Sorted set  "partner-submissions"       score=timestamp(ms), member=id
 *   String      "partner-submission:{id}"   JSON-encoded Submission
 */

const log = createLogger('submissions');

const SUBMISSIONS_KEY = 'partner-submissions';
const SUBMISSION_PREFIX = 'partner-submission:';
const MAX_LIST_SIZE = 500; // trim old entries beyond this

export interface Submission {
  id: string;
  createdAt: number; // Unix ms
  title: string;
  description: string;
  category: string;
  locale: string;
  images: string[]; // Vercel Blob public URLs
}

let _redis: Redis | null = null;
let _redisUnavailable = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (_redisUnavailable) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redisUnavailable = true;
    log.warn(
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — ' +
        'submission metadata will NOT be saved. ' +
        'Add these to .env.local for local testing.'
    );
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

export interface ImageUploadInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Upload a single image to Vercel Blob and return its public URL.
 * BLOB_READ_WRITE_TOKEN must be set in the environment.
 */
export async function uploadImage(input: ImageUploadInput): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. ' +
        'Run `vercel env pull .env.local` or add it manually to .env.local.'
    );
  }
  const { url } = await put(
    `partner-submissions/${input.filename}`,
    input.buffer,
    {
      access: 'public',
      contentType: input.mimeType,
      // addRandomSuffix prevents collisions when two files share a name
      addRandomSuffix: true,
    }
  );
  return url;
}

/**
 * Persist a submission to Redis.
 *
 * We store:
 *   - A sorted set for ordered listing (score = timestamp)
 *   - A string key per submission for O(1) lookup by id
 */
export async function saveSubmission(
  submission: Omit<Submission, 'id' | 'createdAt'> & { createdAt?: number }
): Promise<Submission> {
  const redis = getRedis();
  const createdAt = submission.createdAt ?? Date.now();
  const id = `${createdAt}-${Math.random().toString(36).slice(2, 9)}`;

  const entry: Submission = {
    id,
    createdAt,
    title: submission.title,
    description: submission.description,
    category: submission.category,
    locale: submission.locale,
    images: submission.images,
  };

  if (!redis) {
    // Redis not configured — return the in-memory entry so the API can still
    // respond with 200 during local development without crashing.
    return entry;
  }

  const json = JSON.stringify(entry);

  // Find ids that will be evicted by the trim so we can delete their keys too.
  // zrange with no REV returns oldest first; everything at rank 0..(size-MAX-1)
  // will be dropped after we add the new entry.
  const toEvict = await redis.zrange(SUBMISSIONS_KEY, 0, -(MAX_LIST_SIZE + 1));

  const pipeline = redis.pipeline();
  pipeline.set(`${SUBMISSION_PREFIX}${id}`, json);
  pipeline.zadd(SUBMISSIONS_KEY, { score: createdAt, member: id });
  pipeline.zremrangebyrank(SUBMISSIONS_KEY, 0, -(MAX_LIST_SIZE + 1));
  for (const oldId of toEvict) {
    pipeline.del(`${SUBMISSION_PREFIX}${oldId}`);
  }
  await pipeline.exec();

  log.info('submission saved', { id });
  return entry;
}

/**
 * Return the `limit` most recent submissions (newest first).
 */
export async function listSubmissions(limit = 20): Promise<Submission[]> {
  const redis = getRedis();
  if (!redis) return [];

  // zrange with REV gives newest first
  const ids = await redis.zrange(SUBMISSIONS_KEY, 0, limit - 1, { rev: true });
  if (!ids || ids.length === 0) return [];

  // Batch fetch all submission JSON strings
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`${SUBMISSION_PREFIX}${id}`);
  }
  const results = await pipeline.exec();

  const submissions: Submission[] = [];
  for (const raw of results ?? []) {
    if (!raw) continue;
    try {
      const entry =
        typeof raw === 'string' ? (JSON.parse(raw) as Submission) : (raw as Submission);
      submissions.push(entry);
    } catch (err) {
      log.warn('failed to parse submission', { raw, err });
    }
  }
  return submissions;
}

/**
 * Remove a single submission from Redis (sorted set member + string key).
 */
export async function deleteSubmission(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    log.warn('deleteSubmission called but Redis is not configured');
    return;
  }
  const pipeline = redis.pipeline();
  pipeline.zrem(SUBMISSIONS_KEY, id);
  pipeline.del(`${SUBMISSION_PREFIX}${id}`);
  await pipeline.exec();
  log.info('submission deleted', { id });
}
