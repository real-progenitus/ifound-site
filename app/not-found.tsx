import Link from 'next/link';
import { fontClassName } from './fonts';

/**
 * Site-wide 404 for URLs that match no route, and for an unknown locale.
 *
 * It renders outside app/[locale]/layout.tsx, so it has no translations and
 * brings its own <html> (the root layout is a pass-through). Not-found pages
 * inside [locale] — profiles, the shop — keep their own localized versions.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body className={fontClassName}>
        <main className="min-h-screen bg-[#38B6FF] flex flex-col items-center justify-center gap-6 p-8 text-center font-sans text-white">
          <h1 className="text-4xl font-black uppercase">404</h1>
          <p className="text-lg text-white/90">This page could not be found.</p>
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-2 font-semibold text-[#38B6FF] hover:bg-white/90"
          >
            iFound
          </Link>
        </main>
      </body>
    </html>
  );
}
