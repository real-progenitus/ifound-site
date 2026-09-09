'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/routing';

interface Pack {
  id: string;
  units: number;
  priceCents: number;
}

/**
 * Pack picker, accessory stepper and the checkout button.
 *
 * The prices here are for display and for the running total only. The server
 * recomputes the amount from the same config document before it charges
 * anything, so a tampered client can only ever get itself a 400.
 */
export default function ShopClient({
  packs,
  accessoryEnabled,
  accessoryPriceCents,
  accessoryShowImage,
  shippingCents,
  currency,
  shipsToLabel,
}: {
  packs: Pack[];
  accessoryEnabled: boolean;
  accessoryPriceCents: number;
  accessoryShowImage: boolean;
  shippingCents: number;
  currency: string;
  shipsToLabel: string;
}) {
  const t = useTranslations('shop');
  const locale = useLocale();

  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? '');
  const [accessoryQty, setAccessoryQty] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Read after mount, not during render: the server has no query string, so
  // deriving this inline would render one thing on the server and another in
  // the browser and trip a hydration mismatch.
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    setCancelled(new URLSearchParams(window.location.search).get('cancelled') === '1');
  }, []);

  const money = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    return (cents: number) => formatter.format(cents / 100);
  }, [locale, currency]);

  const selected = packs.find((p) => p.id === selectedPackId) ?? packs[0];

  // The single-unit price is the reference the discount ladder is read against.
  const unitReference = useMemo(() => {
    const single = packs.find((p) => p.units === 1);
    return single ? single.priceCents : null;
  }, [packs]);

  const accessoryCents = accessoryQty * accessoryPriceCents;
  const totalCents = (selected?.priceCents ?? 0) + accessoryCents + shippingCents;

  const selectPack = (pack: Pack) => {
    setSelectedPackId(pack.id);
    // One case per tracker, so a smaller pack has to pull the count down with it.
    setAccessoryQty((qty) => Math.min(qty, pack.units));
  };

  const checkout = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPackId, accessoryQty, locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error ?? 'checkout_failed');
      }
      window.location.href = json.url;
    } catch {
      setError(t('errorGeneric'));
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-lg p-8 text-black">
      {cancelled && (
        <div className="mb-6 bg-gray-100 text-gray-800 px-6 py-4 rounded-lg animate-slide-in">
          {t('cancelled')}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-500 text-white px-6 py-4 rounded-lg animate-slide-in">
          {error}
        </div>
      )}

      <h2 className="text-2xl font-black mb-6">{t('choosePack')}</h2>

      <div className="grid grid-cols-1 min-[500px]:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const isSelected = pack.id === selected?.id;
          const perUnit = pack.priceCents / pack.units;
          const saving = unitReference ? unitReference * pack.units - pack.priceCents : 0;
          const isBest = packs.length > 1 && pack.units === Math.max(...packs.map((p) => p.units));
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => selectPack(pack)}
              aria-pressed={isSelected}
              className={`text-left rounded-lg border-2 p-5 transition-colors ${
                isSelected
                  ? 'border-[#38B6FF] bg-[#38B6FF]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-bold">
                  {pack.units === 1 ? t('packSingle') : t('packMulti', { count: pack.units })}
                </span>
                {isBest && (
                  <span className="text-xs font-semibold bg-[#38B6FF] text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                    {t('bestBadge')}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black">{money(pack.priceCents)}</p>
              <p className="text-sm text-gray-600">{t('perUnit', { price: money(perUnit) })}</p>
              {saving > 0 && (
                <p className="text-sm font-semibold text-[#38B6FF] mt-1">
                  {t('saveBadge', { amount: money(saving) })}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {accessoryEnabled && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex items-start gap-4">
            {accessoryShowImage && (
              <img
                src="/ifound-tag-case.png"
                alt={t('accessoryTitle')}
                width={80}
                height={80}
                className="rounded-lg object-contain shrink-0"
              />
            )}
            <div className="flex-1">
              <p className="font-bold">{t('accessoryTitle')}</p>
              <p className="text-sm text-gray-600">{t('accessoryBlurb')}</p>
              <p className="text-sm text-gray-600">
                {t('accessoryEach', { price: money(accessoryPriceCents) })}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                aria-label="-"
                onClick={() => setAccessoryQty((q) => Math.max(0, q - 1))}
                disabled={accessoryQty === 0}
                className="w-9 h-9 rounded-full bg-gray-100 font-bold disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{accessoryQty}</span>
              <button
                type="button"
                aria-label="+"
                onClick={() =>
                  setAccessoryQty((q) => Math.min(selected?.units ?? 0, q + 1))
                }
                disabled={accessoryQty >= (selected?.units ?? 0)}
                className="w-9 h-9 rounded-full bg-gray-100 font-bold disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-gray-200 pt-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {t('lineTrackers')} × {selected?.units ?? 0}
          </span>
          <span>{money(selected?.priceCents ?? 0)}</span>
        </div>
        {accessoryQty > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t('lineCases')} × {accessoryQty}
            </span>
            <span>{money(accessoryCents)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('lineShipping')}</span>
          <span>{shippingCents > 0 ? money(shippingCents) : t('shippingFree')}</span>
        </div>
        <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-100">
          <span>{t('total')}</span>
          <span>{money(totalCents)}</span>
        </div>
        <p className="text-xs text-gray-500">{t('vatIncluded')}</p>
      </div>

      <button
        type="button"
        onClick={checkout}
        disabled={submitting || !selected}
        className="mt-6 w-full px-8 py-4 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] disabled:opacity-50 transition-colors"
      >
        {submitting ? '…' : `${t('orderAndPay')} · ${money(totalCents)}`}
      </button>

      <p className="mt-3 text-xs text-gray-500">
        {t('shipsTo', { countries: shipsToLabel })}{' '}
        <Link href="/terms" className="text-[#38B6FF] underline">
          {t('termsLink')}
        </Link>
      </p>
    </div>
  );
}
