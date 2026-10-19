import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import { getJob, pick, type Localized } from '@/lib/jobs';
import { defaultPhoneCountry, phoneCountryOptions } from '@/lib/phone';
import { visitorCountry } from '@/lib/shop-geo';
import SiteNav from '../../../components/SiteNav';
import PageFooter from '../../../components/PageFooter';
import JobApplicationForm from './JobApplicationForm';

const SITE_URL = 'https://ifound.tech';
// Setting openGraph here replaces the root layout's, image included, so the
// site preview is restated for the link card.
const PREVIEW_IMAGE = { url: '/preview.png', width: 600, height: 600, alt: 'iFound' };

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** Canonical URL of this page, as shared and as given to og:url. */
function pageUrl(locale: string, slug: string): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${SITE_URL}${prefix}/jobs/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const job = getJob(slug);
  if (!job) return {};

  const title = `${pick(job.title, locale)} · iFound`;
  const description = pick(job.summary, locale);
  const url = pageUrl(locale, slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: [PREVIEW_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [PREVIEW_IMAGE.url] },
  };
}

function Section({ title, items, locale }: { title: string; items?: Localized[]; locale: string }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <h2 className="text-2xl font-bold mt-10 mb-3">{title}</h2>
      <ul className="list-disc pl-6 space-y-2">
        {items.map((item, i) => (
          <li key={i}>{pick(item, locale)}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function JobPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const job = getJob(slug);
  if (!job) notFound();

  const t = await getTranslations('jobs');
  const nav = await getTranslations('nav');
  const phoneCountry = defaultPhoneCountry(visitorCountry(await headers()), locale);

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full min-h-screen bg-[#38B6FF] flex flex-col">
        <SiteNav align="start" links={[
          { href: '/', label: 'Home' },
          { href: '/jobs', label: nav('jobs') },
          { href: '/about', label: nav('aboutUs') },
        ]} />

        <main className="flex items-start justify-center p-8 pt-32 pb-16">
          <div className="max-w-4xl text-white w-full">
            <Link href="/jobs" className="text-white/80 hover:text-white font-semibold">
              ← {t('backToJobs')}
            </Link>
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl mt-4 mb-3">
              {pick(job.title, locale)}
            </h1>
            <p className="text-white/90 font-semibold">
              {pick(job.location, locale)} · {pick(job.employmentType, locale)}
            </p>

            <div className="text-lg leading-relaxed">
              <h2 className="text-2xl font-bold mt-10 mb-3">{t('aboutRole')}</h2>
              <div className="space-y-4">
                {pick(job.description, locale).split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <Section title={t('responsibilities')} items={job.responsibilities} locale={locale} />
              <Section title={t('requirements')} items={job.requirements} locale={locale} />
              <Section title={t('niceToHave')} items={job.niceToHave} locale={locale} />
              <Section title={t('offer')} items={job.offer} locale={locale} />
            </div>

            {job.open ? (
              <JobApplicationForm
                slug={job.slug}
                defaultCountry={phoneCountry}
                countries={phoneCountryOptions(locale)}
              />
            ) : (
              <div className="mt-12 bg-white rounded-lg p-8 text-black">
                <h2 className="text-2xl font-black mb-2">{t('closedTitle')}</h2>
                <p className="text-gray-700">{t('closedBody')}</p>
                <Link href="/jobs" className="inline-block mt-4 font-semibold text-[#38B6FF] hover:text-[#2FA5EE]">
                  {t('backToJobs')} →
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
