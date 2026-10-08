import { cache } from 'react';
import { db } from '@/lib/firebase-admin';

export type SharePost = {
  id: string;
  title: string;
  description: string;
  type: 'Lost' | 'Found';
  category: string;
  address: string | null;
  images: string[];
  reward: string | null;
  currency: string | null;
  isResolved: boolean;
  isExpired: boolean;
  /** 4:5 flyer JPEG rendered for owner sharing, when it exists yet. */
  feedUrl: string | null;
  /** 9:16 flyer JPEG rendered for owner sharing, when it exists yet. */
  storyUrl: string | null;
};

const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** The project's default bucket, where flyer/storage.ts writes the renders. */
const FLYER_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  `${process.env.FIREBASE_PROJECT_ID || 'ifound-4a41c'}.appspot.com`;

/**
 * Only trust a flyer URL that points at the share renders the functions write
 * (flyer/shareFlyer.ts). The post owner can write `shareFlyer` on their own
 * post, so without this check they could make the page — and its og:image —
 * serve any image from anywhere.
 */
function trustedFlyerUrl(raw: unknown, postId: string, isQA: boolean): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    const prefix = isQA ? 'qa_flyers' : 'flyers';
    const [, bucket, folder, id, file] = url.pathname.split('/');
    const ok =
      url.protocol === 'https:' &&
      url.hostname === 'storage.googleapis.com' &&
      bucket === FLYER_BUCKET &&
      folder === prefix &&
      id === postId &&
      (file === 'share-feed.jpg' || file === 'share-story.jpg') &&
      url.pathname.split('/').length === 5;
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Reads one post for its public share page (/share/[postId]). Returns null for
 * anything that should 404: unknown ids, deleted posts, deleted accounts.
 * Resolved and expired posts are returned so the page can say so instead.
 *
 * Wrapped in React's cache() so generateMetadata and the page share one read.
 */
export const getSharePost = cache(
  async (postId: string, isQA: boolean): Promise<SharePost | null> => {
    if (!POST_ID_RE.test(postId)) return null;

    const snap = await db()
      .collection(isQA ? 'QA_Posts' : 'Posts')
      .doc(postId)
      .get();
    const data = snap.data();
    if (!data || data.isDeleted === true || data.accountWasDeleted === true) {
      return null;
    }

    const now = Date.now();
    const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : null;
    const isExpired =
      data.isExpired === true ||
      (!data.hasUnlimitedExpiration && expiresAt !== null && expiresAt < now);

    return {
      id: snap.id,
      title: typeof data.title === 'string' ? data.title : '',
      description: typeof data.description === 'string' ? data.description : '',
      type: data.type === 'Found' ? 'Found' : 'Lost',
      category: typeof data.category === 'string' ? data.category : '',
      address: typeof data.address === 'string' && data.address ? data.address : null,
      images: Array.isArray(data.images)
        ? data.images.filter((u: unknown): u is string => typeof u === 'string')
        : [],
      reward: data.reward != null && String(data.reward) !== '0' ? String(data.reward) : null,
      currency: typeof data.currency === 'string' ? data.currency : null,
      isResolved: data.isResolved === true,
      isExpired,
      feedUrl: trustedFlyerUrl(data.shareFlyer?.feedUrl, snap.id, isQA),
      storyUrl: trustedFlyerUrl(data.shareFlyer?.storyUrl, snap.id, isQA),
    };
  }
);
