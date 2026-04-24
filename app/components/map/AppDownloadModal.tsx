'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import { QRCodeSVG } from 'qrcode.react';

interface AppDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AppDownloadModal({ open, onClose }: AppDownloadModalProps) {
  const t = useTranslations('map');
  const home = useTranslations('home');
  const [qrValue, setQrValue] = useState('https://ifound.tech/download');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setQrValue(`${window.location.origin}/download`);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-[22px] bg-[#009DE0] px-5 pb-5 pt-5 shadow-2xl sm:px-6 sm:pb-5 sm:pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
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

          {/* Mobile-only subheading */}
          <p className="sm:hidden mx-auto mt-3 max-w-[300px] text-[15px] leading-snug text-white/90">
            Download the app to get in contact
          </p>

          {/* QR + hint — desktop only */}
          <div className="hidden sm:block">
            <div className="mx-auto mt-5 w-fit rounded-[18px] border border-[#DADCE0] bg-white p-3 sm:mt-6 sm:p-4">
              <QRCodeSVG
                value={qrValue}
                size={195}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
                aria-label={t('downloadTitle')}
              />
            </div>

            <p className="mx-auto mt-4 max-w-[360px] text-[14px] leading-snug text-white sm:mt-5 sm:text-[16px]">
              {t('downloadQrHint')}
            </p>
          </div>

          {/* Store buttons — stacked on mobile, row on desktop */}
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5">
            <a
              href="https://apps.apple.com/us/app/ifound/id6470928381"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full sm:w-[135px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80"
            >
              <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
              <span className="text-sm font-medium leading-none">{home('appStore')}</span>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.progenitus.ifound"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full sm:w-[135px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90"
            >
              <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium leading-none">{home('googlePlay')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
