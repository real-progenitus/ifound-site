'use client';

import { useTranslations } from 'next-intl';

interface PartnerToggleProps {
  active: boolean;
  onToggle: () => void;
}

export default function PartnerToggle({ active, onToggle }: PartnerToggleProps) {
  const t = useTranslations('map');

  return (
    <button
      onClick={onToggle}
      className={`absolute bottom-28 left-4 z-[1000] px-4 py-2.5 rounded-full shadow-md text-sm font-semibold font-[Roboto] transition-colors ${
        active
          ? 'bg-[#009DE0] text-white'
          : 'bg-white text-[#3A3B3E] hover:bg-gray-50'
      }`}
    >
      {active ? t('postsView') : t('partnerView')}
    </button>
  );
}
