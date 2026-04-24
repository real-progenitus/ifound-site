'use client';

import { useTranslations } from 'next-intl';
import { Counters } from './types';

interface CounterBadgeProps {
  counters: Counters;
}

export default function CounterBadge({ counters }: CounterBadgeProps) {
  const t = useTranslations('map');

  return (
    <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[1000]">
      <div className="bg-white rounded-full px-5 py-2.5 shadow-md flex items-center gap-4 font-[Roboto]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-[#3A3B3E]">
            {t('lost')}: {counters.lost.toLocaleString()}
          </span>
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-[#3A3B3E]">
            {t('found')}: {counters.found.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
