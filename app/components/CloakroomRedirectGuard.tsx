'use client';

import { useEffect } from 'react';
import { useRouter } from '@/routing';
import {
  clearActiveCloakroom,
  fetchActiveCloakroomStatus,
  readActiveCloakroom,
} from '@/lib/cloakroom-active';

/**
 * Renders nothing. When the home page loads, if this browser has an active
 * cloakroom submission (item still awaiting drop-off or in custody), send the
 * customer straight back to its QR so they never lose access to it. The stale
 * entry is cleared once the item has been returned.
 */
export default function CloakroomRedirectGuard() {
  const router = useRouter();

  useEffect(() => {
    const active = readActiveCloakroom();
    if (!active) return;

    let cancelled = false;
    (async () => {
      const result = await fetchActiveCloakroomStatus(active);
      if (cancelled) return;
      if (result) {
        router.replace(`/cloakroom/${result.partnerLocationId}`);
      } else {
        clearActiveCloakroom();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
