import { db } from './firebase-admin';

// Whitelist of fields safe to expose publicly
const PUBLIC_FIELDS = ['name', 'profilePicture', 'email', 'phoneNumber', 'createdAt'] as const;

export interface PublicUserProfile {
  uid: string;
  name: string;
  profilePicture: string | null;
  email: string;
  phoneNumber: string;
  createdAt: number;
}

export async function getUserProfile(uid: string): Promise<PublicUserProfile | null> {
  try {
    console.log('[Profile] Fetching user with uid:', uid);
    const snapshot = await db().collection('QA_Users').where('uid', '==', uid).limit(1).get();
    console.log('[Profile] Document found:', !snapshot.empty);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    if (!data) return null;

    // Only return whitelisted fields — never expose the full document
    const profile: PublicUserProfile = {
      uid: doc.id,
      name: data.name ?? '',
      profilePicture: data.profilePicture ?? null,
      email: data.email ?? '',
      phoneNumber: data.phoneNumber ?? '',
      createdAt: data.createdAt ?? 0,
    };

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
