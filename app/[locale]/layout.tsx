import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/routing';
import { fontClassName } from '../fonts';
import { ShopAvailabilityProvider } from '../components/ShopAvailability';

/**
 * Prebuilds every page under [locale] once per language, so pages with no
 * per-visitor content are served from Vercel's CDN instead of rendering on the
 * server for every visit. Pages that do read per-visitor data (profiles, share
 * pages, the shop) still render on demand; this only stops the layout from
 * forcing it on everything else.
 *
 * A server page that calls next-intl itself (useTranslations / getTranslations)
 * must also call setRequestLocale(locale) to stay static: layouts and pages
 * render independently, so the call here does not reach the page.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={fontClassName}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ShopAvailabilityProvider>{children}</ShopAvailabilityProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
