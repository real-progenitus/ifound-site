'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import {
  clearActiveCloakroom,
  fetchActiveCloakroomStatus,
  readActiveCloakroom,
  saveActiveCloakroom,
} from '@/lib/cloakroom-active';

// Hidden, browser-local QA toggle. Tapping the logo 12 times silently flips the
// mode; persisted in localStorage, never visible to other visitors.
const QA_STORAGE_KEY = 'cloakroom-qa-mode';
const TAPS_TO_TOGGLE = 12;
const TAP_RESET_MS = 1500;

export default function CloakroomRegistration() {
  const t = useTranslations('cloakroom');
  const params = useParams();
  const locationId = Array.isArray(params.locationId)
    ? params.locationId[0]
    : (params.locationId as string);

  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  // True until we've checked localStorage for an in-progress submission, so we
  // can restore its QR instead of flashing a blank form on return.
  const [restoring, setRestoring] = useState(true);

  // Venue branding shown above the form (logo + name).
  const [location, setLocation] = useState<{ title: string; logoUrl: string } | null>(
    null
  );

  const [qaMode, setQaMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore the persisted QA preference after mount (localStorage is unavailable
  // during SSR, so we read it here to avoid a hydration mismatch).
  useEffect(() => {
    try {
      setQaMode(localStorage.getItem(QA_STORAGE_KEY) === '1');
    } catch {
      /* ignore unavailable storage */
    }
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  // Fetch the venue's display info (logo + name) for the header. Re-runs if the
  // QA toggle flips so we read from the matching environment's collection.
  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/cloakroom?locationId=${encodeURIComponent(locationId)}` +
            `&environment=${qaMode ? 'qa' : 'production'}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { title?: string; logoUrl?: string };
        if (!cancelled) {
          setLocation({ title: data.title ?? '', logoUrl: data.logoUrl ?? '' });
        }
      } catch {
        /* branding is non-critical — ignore failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId, qaMode]);

  // Restore a still-active submission for this location so the customer keeps
  // their QR after closing/reopening the page. If the item has already been
  // returned (or no longer exists), drop the stale entry and show the form.
  useEffect(() => {
    if (!locationId) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    const active = readActiveCloakroom();
    if (!active || active.locationId !== locationId) {
      setRestoring(false);
      return;
    }
    // Match the environment the item was registered in.
    if (active.environment === 'qa') setQaMode(true);
    (async () => {
      const result = await fetchActiveCloakroomStatus(active);
      if (cancelled) return;
      if (result) {
        setToken(active.token);
      } else {
        clearActiveCloakroom();
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const handleLogoTap = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    const next = tapCount + 1;
    if (next >= TAPS_TO_TOGGLE) {
      setTapCount(0);
      const enabled = !qaMode;
      setQaMode(enabled);
      try {
        if (enabled) localStorage.setItem(QA_STORAGE_KEY, '1');
        else localStorage.removeItem(QA_STORAGE_KEY);
      } catch {
        /* ignore unavailable storage */
      }
      return;
    }
    setTapCount(next);
    tapTimer.current = setTimeout(() => setTapCount(0), TAP_RESET_MS);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!phone.trim() || !description.trim()) {
      setError(t('required'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/cloakroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerLocationId: locationId,
          phone: phone.trim(),
          description: description.trim(),
          environment: qaMode ? 'qa' : 'production',
        }),
      });

      if (!res.ok) {
        setError(res.status === 404 ? t('invalidLocation') : t('errorGeneric'));
        return;
      }

      const data = (await res.json()) as { token?: string };
      if (data.token) {
        setToken(data.token);
        // Remember it so the QR survives reloads / revisits until returned.
        saveActiveCloakroom({
          token: data.token,
          locationId,
          environment: qaMode ? 'qa' : 'production',
        });
      } else {
        setError(t('errorGeneric'));
      }
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  // Venue branding above the card. Rendered on both the form and success views.
  const partnerHeader = location?.logoUrl ? (
    <div className="mb-4 flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={location.logoUrl}
        alt={location.title || 'Partner'}
        className="h-20 w-20 rounded-full border-2 border-white bg-white object-cover shadow-lg"
      />
      {location.title && (
        <span className="text-center text-base font-semibold text-white">
          {location.title}
        </span>
      )}
    </div>
  ) : null;

  const logoFooter = (
    <div className="mt-6 flex flex-col items-center">
      <button
        type="button"
        onClick={handleLogoTap}
        aria-label="iFound"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.png"
          alt="iFound"
          width={55}
          height={55}
          className="object-contain brightness-0 invert"
        />
      </button>
    </div>
  );

  // While checking for a saved submission, hold on a plain background so we
  // don't flash the form before swapping it for a restored QR.
  if (restoring) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#38B6FF] px-6 py-12" />
    );
  }

  // After submission: show the QR for the attendant to scan.
  if (token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#38B6FF] px-6 py-12">
        {partnerHeader}
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-[#171717]">{t('successTitle')}</h1>
          <p className="mt-2 text-[15px] leading-snug text-[#555555]">
            {t('showAttendant')}
          </p>
          <div className="mx-auto mt-6 w-fit rounded-2xl border border-[#E5E0F5] bg-white p-4">
            <QRCodeSVG
              value={`ifound-cl:${token}`}
              size={220}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              aria-label={t('successTitle')}
            />
          </div>
          <p className="mt-6 text-[13px] leading-snug text-[#888888]">
            {t('successInstruction')}
          </p>
        </div>
        {logoFooter}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#38B6FF] px-6 py-12">
      {partnerHeader}
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-[#171717]">{t('title')}</h1>
        <p className="mt-2 text-[15px] leading-snug text-[#555555]">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[#171717]">
              {t('phoneLabel')}
            </span>
            <input
              type="tel"
              inputMode="tel"
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="rounded-xl border border-[#E5E0F5] bg-[#FAF9FF] px-4 py-3 text-[16px] text-[#171717] outline-none focus:border-[#7C3AED]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[#171717]">
              {t('descriptionLabel')}
            </span>
            <textarea
              maxLength={280}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="resize-none rounded-xl border border-[#E5E0F5] bg-[#FAF9FF] px-4 py-3 text-[16px] text-[#171717] outline-none focus:border-[#7C3AED]"
            />
          </label>

          {error && <p className="text-sm font-medium text-[#FF5449]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-xl bg-[#38B6FF] py-3.5 text-[16px] font-bold text-white transition-opacity disabled:opacity-60"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>

      </div>
      {logoFooter}
    </main>
  );
}
