'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';

export default function AppDownloadPrompt() {
  const t = useTranslations('map');
  const home = useTranslations('home');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 z-[1005] flex flex-col items-center justify-center gap-1.5 w-[72px] h-[76px] rounded-2xl bg-[#009DE0] shadow-md transition-transform hover:scale-[1.03] text-white"
        aria-label={t('downloadLauncher')}
      >
        <img src="/favicon.png" alt="iFound" className="h-8 w-8" />
        <span className="text-[11px] font-semibold leading-none">Download</span>
      </button>

      {open && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-black/35 p-4" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-[480px] rounded-[22px] bg-[#009DE0] px-5 pb-5 pt-5 shadow-2xl sm:px-6 sm:pb-5 sm:pt-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              aria-label={t('close')}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="font-[var(--font-geist-sans)] text-center">
              <h2 className="mx-auto max-w-[340px] pr-8 text-[24px] font-medium tracking-[-0.03em] text-white sm:text-[31px] sm:leading-[1.08]">
                {t('downloadTitle')}
              </h2>

              <div className="mx-auto mt-5 w-fit rounded-[18px] border border-[#DADCE0] bg-white p-2.5 sm:mt-6 sm:p-3">
                <img src="/ifound-qr.png" alt={t('downloadTitle')} className="h-[155px] w-[155px] sm:h-[195px] sm:w-[195px]" />
              </div>

              <p className="mx-auto mt-4 max-w-[360px] text-[14px] leading-snug text-white sm:mt-5 sm:text-[16px]">
                {t('downloadQrHint')}
              </p>

              <div className="mt-4 flex flex-row flex-wrap items-center justify-center gap-2.5 sm:mt-5">
                <a
                  href="https://apps.apple.com/us/app/ifound/id6470928381"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-[135px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80"
                >
                  <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
                  <span className="text-sm font-medium leading-none">{home('appStore')}</span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.progenitus.ifound"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-[135px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90"
                >
                  <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium leading-none">{home('googlePlay')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
