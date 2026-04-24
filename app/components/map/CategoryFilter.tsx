'use client';

import { useTranslations } from 'next-intl';

const CATEGORIES = [
  { key: 'pets', icon: '/paw.svg', filterValue: 'Pets' },
  { key: 'persons', icon: '/person.svg', filterValue: 'Persons' },
  { key: 'wallets', icon: '/wallet.svg', filterValue: 'Wallets' },
  { key: 'keys', icon: '/key.svg', filterValue: 'Keys' },
  { key: 'electronics', icon: '/earpods.svg', filterValue: 'Electronics' },
  { key: 'phones', icon: '/phone.svg', filterValue: 'Phones' },
  { key: 'glasses', icon: '/glasses.svg', filterValue: 'Glasses' },
  { key: 'clothes', icon: '/tshirt.svg', filterValue: 'Clothes' },
  { key: 'vehicles', icon: '/vehicles.svg', filterValue: 'Vehicles' },
  { key: 'other', icon: '/box.svg', filterValue: 'Other' },
];

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const t = useTranslations('map');

  return (
    <div className="absolute top-[60px] left-0 right-0 z-[1000] px-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 justify-center">
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.filterValue;
          return (
            <button
              key={cat.key}
              onClick={() => onSelect(isActive ? null : cat.filterValue)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium font-[var(--font-roboto)] whitespace-nowrap shrink-0 transition-colors shadow-sm ${
                isActive
                  ? 'bg-[#009DE0] text-white'
                  : 'bg-white text-[#3A3B3E] hover:bg-gray-50'
              }`}
            >
              <img src={cat.icon} alt="" className="w-5 h-5" style={isActive ? { filter: 'brightness(0) invert(1)' } : {}} />
              <span>{t(`categories.${cat.key}` as any)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
