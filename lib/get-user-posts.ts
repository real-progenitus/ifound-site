import { db } from './firebase-admin';

export interface PublicPost {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  address: string;
  reward: string;
  currency: string;
  images: string[];
  timestamp: number;
  isResolved: boolean;
}

export async function getUserPosts(userEmail: string): Promise<PublicPost[]> {
  try {
    const snapshot = await db()
      .collection('QA_Posts')
      .where('user', '==', userEmail)
      .where('isDeleted', '==', false)
      .where('accountWasDeleted', '==', false)
      .where('type', '==', 'Lost')
      .where('isResolved', '==', false)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? '',
        description: data.description ?? '',
        category: data.category ?? '',
        type: data.type ?? '',
        address: data.address ?? '',
        reward: data.reward ?? '',
        currency: data.currency ?? 'EUR',
        images: data.images ?? [],
        timestamp: data.timestamp ?? 0,
        isResolved: data.isResolved ?? false,
      };
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
}
