import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/routing';
import {cookies, headers} from 'next/headers';
import {getShopConfig} from '@/lib/shop-config';
import {SHOP_QA_COOKIE, resolveShopEnvironment} from '@/lib/shop-env';
import {geoHeaderExpected, isVisitorInShopCountry, visitorCountry} from '@/lib/shop-geo';
import {ShopAvailabilityProvider} from './components/ShopAvailability';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover lets us read env(safe-area-inset-*) values on
  // notched iOS devices, which the map page uses to keep the fixed
  // header below the status bar / dynamic island.
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "iFound - Lost & Found App",
  description: "The general purpose lost and found app that changes the way you recover your lost items.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "iFound - Lost & Found App",
    description: "The general purpose lost and found app that changes the way you recover your lost items.",
    images: [
      {
        url: "/preview.png",
        width: 600,
        height: 600,
        alt: "iFound - Lost & Found App",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iFound - Lost & Found App",
    description: "The general purpose lost and found app that changes the way you recover your lost items.",
    images: ["/preview.png"],
  },
  other: {
    "facebook-domain-verification": "q13beunbemyy8kkvmhhfubx63xlt0p",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale?: string}>;
}>) {
  const {locale = routing.defaultLocale} = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
 
  // Read once here rather than in the nav: the shop flag comes from Firestore
  // via firebase-admin, and the nav is rendered inside client-component pages
  // that cannot import it. See app/components/ShopAvailability.tsx.
  //
  // The environment comes from the hidden QA cookie, so a tester sees the QA
  // catalogue everywhere the shop appears, including the nav link.
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const shopEnvironment = resolveShopEnvironment(cookieStore.get(SHOP_QA_COOKIE)?.value);
  const [messages, shop] = await Promise.all([
    getMessages(),
    getShopConfig(shopEnvironment),
  ]);

  // The nav only links to the shop for visitors it would actually serve, so
  // nobody outside the shipping countries is sent to a page that 404s for them.
  const shopVisible =
    shop.shopEnabled &&
    isVisitorInShopCountry({
      shopCountries: shop.shopCountries,
      country: visitorCountry(headerStore),
      environment: shopEnvironment,
      headerExpected: geoHeaderExpected(),
    });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ShopAvailabilityProvider
            enabled={shopVisible}
            environment={shopEnvironment}
          >
            {children}
          </ShopAvailabilityProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
