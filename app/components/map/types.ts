export interface MapPost {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  address: string;
  reward: string;
  currency: string;
  images: string[];
  timestamp: number;
  isResolved: boolean;
  isPromoted: boolean;
  latitude: number;
  longitude: number;
}

export interface PartnerLocation {
  id: string;
  title: string;
  logoUrl: string;
  contact: string;
  partnerId: string;
  latitude: number;
  longitude: number;
}

export interface Counters {
  lost: number;
  found: number;
}

export const CATEGORY_ICON_MAP: Record<string, string> = {
  Other: 'box',
  Electronics: 'earpods',
  Glasses: 'glasses',
  Keys: 'key',
  Pets: 'paw',
  Persons: 'person',
  Clothes: 'tshirt',
  Vehicles: 'vehicles',
  Wallets: 'wallet',
  other: 'box',
  electronics: 'earpods',
  glasses: 'glasses',
  keys: 'key',
  pets: 'paw',
  persons: 'person',
  clothes: 'tshirt',
  vehicles: 'vehicles',
  wallets: 'wallet',
  Eletronics: 'earpods',
  Phones: 'phone',
};

const PIN_CATEGORY_MAP: Record<string, string> = {
  Other: 'others',
  Electronics: 'eletronics',
  Eletronics: 'eletronics',
  Phones: 'phone',
  Glasses: 'glasses',
  Keys: 'key',
  Pets: 'pets',
  Persons: 'person',
  Clothes: 'clothes',
  Vehicles: 'vehicles',
  Wallets: 'wallet',
  other: 'others',
  electronics: 'eletronics',
  eletronics: 'eletronics',
  phones: 'phone',
  glasses: 'glasses',
  keys: 'key',
  pets: 'pets',
  persons: 'person',
  clothes: 'clothes',
  vehicles: 'vehicles',
  wallets: 'wallet',
};

export function getPinIcon(category: string, type: string, isPromoted: boolean): string {
  const base = PIN_CATEGORY_MAP[category] ?? 'others';
  if (isPromoted) return `/pin-${base}-promoted.svg`;
  const variant = type === 'Lost' ? 'lost' : 'found';
  return `/pin-${base}-${variant}.svg`;
}

export function getCategoryIcon(category: string): string {
  const base = CATEGORY_ICON_MAP[category] ?? 'box';
  return `/${base}.svg`;
}

export interface RegionCounter {
  name: string;
  bounds: {
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  };
  counters: Record<string, number>;
}
