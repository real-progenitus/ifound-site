import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let _db: Firestore | null = null;

/**
 * Normalise a FIREBASE_PRIVATE_KEY env value.
 *
 * Vercel / other hosts will hand us one of two shapes depending on how the
 * secret was entered:
 *   - escaped form: "...\\n-----END..."  (literal backslash-n, from copying
 *     the raw JSON field value)
 *   - real newlines: multi-line string (from `vercel env add < file`)
 *
 * `cert()` requires real newlines, so we convert the escaped form and leave
 * already-correct values alone. Trim whitespace to tolerate trailing newlines
 * in env editors.
 */
function normalisePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const trimmed = raw.trim();
  return trimmed.includes('\\n') ? trimmed.replace(/\\n/g, '\n') : trimmed;
}

function getDb(): Firestore {
  if (!_db) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      });
    }
    _db = getFirestore();
  }
  return _db;
}

export { getDb as db };
