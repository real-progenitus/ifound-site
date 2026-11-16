import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover lets us read env(safe-area-inset-*) values on
  // notched iOS devices, which the map page uses to keep the fixed
  // header below the status bar / dynamic island.
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  // Resolves relative og/twitter image paths (e.g. /preview.png) to absolute
  // URLs, which link-preview crawlers require.
  metadataBase: new URL("https://ifound.tech"),
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

/**
 * Pass-through root layout. The <html> shell lives one level down, in
 * app/[locale]/layout.tsx (and app/enable-notifications/layout.tsx), because
 * only there is the locale known.
 *
 * Keep this file free of request data — no cookies(), headers() or Firestore.
 * Whatever a root layout reads, every page on the site inherits: when it read
 * the shop config and the visitor's country to decide the nav's Shop link,
 * every page (About, Privacy, the home page, ...) was rendered on the server
 * for every visit, in 12 languages, and the account ran out of Vercel's Active
 * CPU in November 2026. The Shop link is now decided in the browser; see
 * app/components/ShopAvailability.tsx.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
