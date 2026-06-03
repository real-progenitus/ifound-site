'use client';

import { useEffect, useState } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/ifound/id6470928381';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.progenitus.ifound';
const APP_DEEP_LINK = 'ifound://notifications/enable';

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(ua: string): Platform {
  const lower = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(lower);
  const isIPadOS = /macintosh/.test(lower) && /mobile/.test(lower);
  if (isIOS || isIPadOS) return 'ios';
  if (/android/.test(lower)) return 'android';
  return 'other';
}

export default function EnableNotificationsPage() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [appOpenFailed, setAppOpenFailed] = useState(false);

  const storeUrl =
    platform === 'ios'
      ? APP_STORE_URL
      : platform === 'android'
        ? PLAY_STORE_URL
        : null;

  useEffect(() => {
    const detected = detectPlatform(navigator.userAgent);
    setPlatform(detected);

    // On mobile, try to open the app directly. If it isn't installed, the
    // browser stays in the foreground and we fall back to the store.
    if (detected === 'ios' || detected === 'android') {
      let didHide = false;
      const onVisibility = () => {
        if (document.hidden) didHide = true;
      };
      document.addEventListener('visibilitychange', onVisibility);

      const start = Date.now();
      window.location.href = APP_DEEP_LINK;

      const timer = setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        // If the app opened, the page was backgrounded (didHide) or enough
        // time was "lost" to the app-switch prompt. Otherwise, show fallback.
        if (!didHide && Date.now() - start < 2500) {
          setAppOpenFailed(true);
        }
      }, 2000);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        background: '#EDEEEF',
        color: '#171717',
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          Turn on notifications
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: '#555', marginBottom: 28 }}>
          {platform === 'other'
            ? 'Open this link on the device where the iFound app is installed to enable notifications.'
            : 'Opening the iFound app…'}
        </p>

        <a
          href={APP_DEEP_LINK}
          style={{
            display: 'inline-block',
            background: '#009DE0',
            color: '#fff',
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: 20,
            textDecoration: 'none',
            marginBottom: 16,
          }}
        >
          Open the iFound app
        </a>

        {(appOpenFailed || platform === 'other') && storeUrl && (
          <p style={{ marginTop: 8 }}>
            <a
              href={storeUrl}
              style={{ color: '#009DE0', fontWeight: 600, textDecoration: 'none' }}
            >
              Don&apos;t have the app? Download it here
            </a>
          </p>
        )}

        {platform === 'other' && (
          <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <a href={APP_STORE_URL} style={{ color: '#009DE0', textDecoration: 'none' }}>
              App Store
            </a>
            <a href={PLAY_STORE_URL} style={{ color: '#009DE0', textDecoration: 'none' }}>
              Google Play
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
