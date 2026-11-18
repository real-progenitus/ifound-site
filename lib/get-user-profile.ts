import { db } from './firebase-admin';
import { createLogger } from './logger';

const log = createLogger('profile');

// The fields safe to expose publicly. Never the email or phone number: anyone
// who wants to reach a user does it through the in-app chat, where the scam
// scan and user reports work (ifound-functions moderation/).
export interface PublicUserProfile {
  uid: string;
  /** The account uid (the Users doc's `uid` field), which posts are keyed by. */
  accountUid: string;
  name: string;
  profilePicture: string | null;
  createdAt: number;
}

export async function getUserProfile(uid: string): Promise<PublicUserProfile | null> {
  try {
    // Do not log `uid` in production — it's a user identifier and ends up in
    // log retention. If you need to correlate, hash it or use a request id.
    log.debug('fetching user profile', { uid });
    const snapshot = await db().collection('QA_Users').where('uid', '==', uid).limit(1).get();
    log.debug('profile lookup result', { found: !snapshot.empty });

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    if (!data) return null;

    // Only return whitelisted fields — never expose the full document
    const profile: PublicUserProfile = {
      uid: doc.id,
      accountUid: typeof data.uid === 'string' ? data.uid : uid,
      name: data.name ?? '',
      profilePicture: data.profilePicture ?? null,
      createdAt: data.createdAt ?? 0,
    };

    return profile;
  } catch (error) {
    log.error('failed to fetch user profile', error);
    return null;
  }
}
