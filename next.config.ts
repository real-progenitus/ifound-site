import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const APP_STORE_URL = 'https://apps.apple.com/us/app/ifound/id6470928381';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.progenitus.ifound';

/**
 * /download sends phones to their app store and everyone else home.
 *
 * Done as config redirects, which Vercel's router answers on its own, rather
 * than as a page that sniffs the user agent: that page ran a server function
 * for every scan of the download QR code. Rules match in order; `has` values
 * are regexes anchored to the whole header, hence the `.*`.
 */
const userAgent = (pattern: string) => [{ type: 'header' as const, key: 'user-agent', value: `.*${pattern}.*` }];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/download', has: userAgent('(?:iPhone|iPad|iPod)'), destination: APP_STORE_URL, permanent: false },
      // iPadOS can report itself as a Mac; "Mobile" gives it away.
      { source: '/download', has: userAgent('Macintosh.*Mobile'), destination: APP_STORE_URL, permanent: false },
      { source: '/download', has: userAgent('Android'), destination: PLAY_STORE_URL, permanent: false },
      { source: '/download', destination: '/', permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      // The job application form uploads an optional CV (capped at 4 MB in
      // lib/jobs.ts); Next's 1 MB default would reject most of them.
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
