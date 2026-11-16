import { Geist, Geist_Mono, Roboto } from 'next/font/google';

// Shared by every layout that renders <html>: the localized site and the
// non-localized /enable-notifications page.
//
// latin-ext carries the Polish, Romanian, Turkish and Hungarian letters (ą, ș,
// ğ, ő). Geist has no Greek; Greek text falls back to the system font there.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin', 'latin-ext', 'greek'],
  weight: ['400', '500', '700'],
});

export const fontClassName = `${geistSans.variable} ${geistMono.variable} ${roboto.variable} antialiased`;
