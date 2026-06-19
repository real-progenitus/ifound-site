'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

// Hidden, browser-local QA toggle. Tapping the logo this many times flips the
// mode; the choice is persisted in localStorage so it survives reloads and is
// scoped to the one browser doing the testing — it never touches the server or
// other visitors.
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

  const [qaMode, setQaMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [toast, setToast] = useState('');
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

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
      showToast(
        enabled
          ? 'QA mode ON — submissions go to the QA environment'
          : 'QA mode OFF — back to production'
      );
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
      } else {
        setError(t('errorGeneric'));
      }
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const logoFooter = (
    <div className="mt-8 flex flex-col items-center gap-1.5">
      {qaMode && (
        <span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-semibold text-[#6D28D9]">
          QA mode
        </span>
      )}
      <button
        type="button"
        onClick={handleLogoTap}
        aria-label="iFound"
        className="opacity-50 transition-opacity hover:opacity-90 active:opacity-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.png"
          alt="iFound"
          width={36}
          height={36}
          className="object-contain"
        />
      </button>
    </div>
  );

  const toastEl = toast ? (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#171717] px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
    >
      {toast}
    </div>
  ) : null;

  // After submission: show the QR for the attendant to scan.
  if (token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#38B6FF] px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
          {qaMode && (
            <span className="mb-3 inline-block rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-semibold text-[#6D28D9]">
              QA
            </span>
          )}
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
        {toastEl}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#38B6FF] px-6 py-12">
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
            className="mt-2 rounded-xl bg-[#7C3AED] py-3.5 text-[16px] font-bold text-white transition-opacity disabled:opacity-60"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>

      </div>
      {logoFooter}
      {toastEl}
    </main>
  );
}
