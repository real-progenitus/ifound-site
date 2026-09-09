import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import SiteNav from '../../../components/SiteNav';

/**
 * Segment-scoped not-found UI. Rendered when `ProfilePage` calls
 * `notFound()` — i.e. the uid doesn't resolve to a QA_Users document.
 *
 * Why a dedicated file rather than inlining the markup in `page.tsx`:
 * returning JSX for the missing case gives a 200 status, which both breaks
 * crawlers' ability to honour the "this profile doesn't exist" signal and
 * makes the CDN cache the "not found" body at the s-maxage we set in
 * middleware. Going through `notFound()` gets us a real 404 and Next.js's
 * default no-store behaviour for error responses.
 */
export default async function ProfileNotFound() {
  const t = await getTranslations('profile');
  const nav = await getTranslations('nav');

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        <SiteNav
          links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: nav('aboutUs') },
            { href: '/contact', label: nav('contacts') },
          ]}
        />
        <main className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center text-white">
            <h1 className="text-4xl font-black mb-4">{t('userNotFound')}</h1>
            <p className="text-lg mb-8 opacity-80">{t('userNotFoundDescription')}</p>
            <Link
              href="/"
              className="inline-block bg-white text-[#38B6FF] font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
            >
              {t('goHome')}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
