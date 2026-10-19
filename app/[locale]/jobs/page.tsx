import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import { openJobs, pick } from '@/lib/jobs';
import SiteNav from '../../components/SiteNav';
import PageFooter from '../../components/PageFooter';

type PageProps = { params: Promise<{ locale: string }> };

// Setting openGraph here replaces the root layout's, image included.
const PREVIEW_IMAGE = { url: '/preview.png', width: 600, height: 600, alt: 'iFound' };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'jobs' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: { title: t('metaTitle'), description: t('metaDescription'), images: [PREVIEW_IMAGE] },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('metaDescription'),
      images: [PREVIEW_IMAGE.url],
    },
  };
}

export default async function JobsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('jobs');
  const nav = await getTranslations('nav');
  const jobs = openJobs();

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full min-h-screen bg-[#38B6FF] flex flex-col">
        <SiteNav align="start" links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: nav('aboutUs') },
          { href: '/partner', label: nav('becomePartner') },
        ]} />

        <main className="flex items-start justify-center p-8 pt-32 pb-16">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">{t('title')}</h1>
            <p className="text-lg leading-relaxed">{t('intro')}</p>

            <div className="mt-12 space-y-4">
              {jobs.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-gray-700">{t('noOpenings')}</div>
              ) : (
                jobs.map((job) => (
                  <Link
                    key={job.slug}
                    href={`/jobs/${job.slug}`}
                    className="block bg-white rounded-lg p-6 md:p-8 text-black hover:shadow-xl transition-shadow"
                  >
                    <h2 className="text-xl md:text-2xl font-black">{pick(job.title, locale)}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {pick(job.location, locale)} · {pick(job.employmentType, locale)}
                    </p>
                    <p className="mt-3 text-gray-700">{pick(job.summary, locale)}</p>
                    <span className="inline-block mt-4 font-semibold text-[#38B6FF]">{t('viewJob')} →</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
