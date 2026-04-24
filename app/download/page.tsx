import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const APP_STORE_URL = 'https://apps.apple.com/us/app/ifound/id6470928381';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.progenitus.ifound';

// Server-side redirect: sniff the User-Agent and send mobile users to their
// respective store. Desktop / unknown clients fall back to the landing page.
export default async function DownloadRedirectPage() {
  const headersList = await headers();
  const ua = (headersList.get('user-agent') || '').toLowerCase();

  const isIOS = /iphone|ipad|ipod/.test(ua);
  // Treat iPadOS (reports as "Macintosh" with touch) as iOS too.
  const isIPadOS = /macintosh/.test(ua) && /mobile/.test(ua);
  const isAndroid = /android/.test(ua);

  if (isIOS || isIPadOS) {
    redirect(APP_STORE_URL);
  }

  if (isAndroid) {
    redirect(PLAY_STORE_URL);
  }

  // Desktop / other: send them back home where they can see the download
  // section (or scan the QR code in the footer).
  redirect('/');
}
