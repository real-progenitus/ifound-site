/**
 * Browser-local memory of the customer's active cloakroom submission.
 *
 * After registering an item the customer is shown a QR that the attendant
 * scans. That QR only lives in component state, so closing the tab used to lose
 * it and drop the customer back on a blank form. We persist the issued token
 * (plus its location + environment) in localStorage so the cloakroom page can
 * re-show the QR on return, and the home page can redirect back to it — until
 * the item has been returned, at which point the entry is cleared.
 *
 * Only the opaque token is stored; the phone/description never leave the form.
 */
import type { CloakroomEnvironment } from './cloakroom-env';

const ACTIVE_KEY = 'ifound-cloakroom-active';

export type ActiveCloakroom = {
  token: string;
  locationId: string;
  environment: CloakroomEnvironment;
};

export function readActiveCloakroom(): ActiveCloakroom | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveCloakroom>;
    if (!parsed?.token || !parsed?.locationId) return null;
    return {
      token: parsed.token,
      locationId: parsed.locationId,
      environment: parsed.environment === 'qa' ? 'qa' : 'production',
    };
  } catch {
    return null;
  }
}

export function saveActiveCloakroom(active: ActiveCloakroom): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  } catch {
    /* ignore unavailable storage */
  }
}

export function clearActiveCloakroom(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore unavailable storage */
  }
}

/**
 * Ask the server whether a registered item is still active (awaiting drop-off
 * or held in custody). Returns the item's location when active so callers can
 * route back to it, or null once it's been returned / no longer exists.
 */
export async function fetchActiveCloakroomStatus(
  active: ActiveCloakroom
): Promise<{ partnerLocationId: string } | null> {
  try {
    const res = await fetch(
      `/api/cloakroom?token=${encodeURIComponent(active.token)}` +
        `&environment=${active.environment === 'qa' ? 'qa' : 'production'}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      partnerLocationId?: string;
    };
    const isActive = data.status === 'pending' || data.status === 'in_custody';
    if (!isActive) return null;
    return { partnerLocationId: data.partnerLocationId ?? active.locationId };
  } catch {
    return null;
  }
}
