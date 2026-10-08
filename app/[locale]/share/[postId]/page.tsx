import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getSharePost, SharePost } from '@/lib/get-share-post';
import SiteNav from '../../../components/SiteNav';
import PageFooter from '../../../components/PageFooter';
import ShareFlyerActions from './ShareFlyerActions';

// Rate limit + CDN cache header for this path live in `middleware.ts`, same as
// the profile page: every share is a burst of visitors (and link-preview
// crawlers) hitting the same post id.

const SITE_URL = 'https://ifound.tech';

type PageProps = {
  params: Promise<{ locale: string; postId: string }>;
  searchParams: Promise<{ env?: string }>;
};

/** Canonical URL of this page, as shared and as given to og:url. */
function pageUrl(locale: string, postId: string, isQA: boolean): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${SITE_URL}${prefix}/share/${encodeURIComponent(postId)}${isQA ? '?env=qa' : ''}`;
}

/** The flyer when it exists, else the post's own photo, else the site preview. */
function previewImage(post: SharePost): string {
  return post.feedUrl ?? post.images[0] ?? `${SITE_URL}/preview.png`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ locale, postId }, { env }] = await Promise.all([params, searchParams]);
  const isQA = env === 'qa';
  const post = await getSharePost(postId, isQA);
  if (!post) return {};

  const t = await getTranslations({ locale, namespace: 'share' });
  const title =
    post.type === 'Lost'
      ? t('ogTitleLost', { title: post.title })
      : t('ogTitleFound', { title: post.title });
  const description = [post.address, t('ogDescription')].filter(Boolean).join(' · ');
  const image = previewImage(post);
  const url = pageUrl(locale, postId, isQA);
  const hasFlyer = image === post.feedUrl;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Shared posts are for people the owner sends them to, not for search.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [
        hasFlyer
          ? { url: image, width: 1080, height: 1350, alt: post.title }
          : { url: image, alt: post.title },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const [{ locale, postId }, { env }] = await Promise.all([params, searchParams]);
  const isQA = env === 'qa';
  const post = await getSharePost(postId, isQA);
  if (!post) notFound();

  const t = await getTranslations('share');
  const nav = await getTranslations('nav');
  const isActive = !post.isResolved && !post.isExpired;
  const image = previewImage(post);
  const envQuery = isQA ? '&env=qa' : '';

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full min-h-screen bg-[#38B6FF] flex flex-col">
        <SiteNav links={[
          { href: '/', label: 'Home' },
          { href: '/map', label: 'Map' },
          { href: '/about', label: nav('aboutUs') },
        ]} />

        <main className="flex-1 flex items-start justify-center px-4 pt-20 pb-12 min-[600px]:pt-32">
          <div className="w-full max-w-md text-white">
            {isActive ? (
              <>
                <h1 className="text-center text-3xl md:text-4xl font-black">
                  {post.type === 'Lost' ? t('headingLost') : t('headingFound')}
                </h1>
                <p className="text-center text-white/90 mt-3">{t('subtitle')}</p>
              </>
            ) : (
              <>
                <h1 className="text-center text-3xl md:text-4xl font-black">
                  {post.isResolved ? t('resolvedTitle') : t('expiredTitle')}
                </h1>
                <p className="text-center text-white/90 mt-3">
                  {post.isResolved ? t('resolvedBody') : t('expiredBody')}
                </p>
              </>
            )}

            <div className="mt-8 bg-white rounded-2xl overflow-hidden shadow-xl text-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={post.title}
                className={`w-full ${post.feedUrl ? 'aspect-[4/5]' : 'aspect-square'} object-cover`}
              />
              {!post.feedUrl && (
                <div className="p-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${
                    post.type === 'Lost' ? 'bg-red-500' : 'bg-green-500'
                  }`}>
                    {post.type === 'Lost' ? t('lostBadge') : t('foundBadge')}
                  </span>
                  <h2 className="text-lg font-bold mt-2">{post.title}</h2>
                  {post.address && <p className="text-gray-500 text-sm mt-1">{post.address}</p>}
                  {post.reward && (
                    <p className="text-sm font-bold text-[#38B6FF] mt-2">
                      {t('reward')}: {post.reward} {post.currency}
                    </p>
                  )}
                </div>
              )}
            </div>

            {isActive && (
              <ShareFlyerActions
                pageUrl={pageUrl(locale, postId, isQA)}
                shareText={
                  post.type === 'Lost'
                    ? t('shareTextLost', { title: post.title })
                    : t('shareTextFound', { title: post.title })
                }
                feedImagePath={post.feedUrl ? `/api/share-image/${postId}?format=feed${envQuery}` : null}
                storyImagePath={post.storyUrl ? `/api/share-image/${postId}?format=story${envQuery}` : null}
                labels={{
                  shareFlyer: t('shareFlyer'),
                  formatFeed: t('formatFeed'),
                  formatStory: t('formatStory'),
                  shareOn: t('shareOn'),
                  copyLink: t('copyLink'),
                  linkCopied: t('linkCopied'),
                  downloadImage: t('downloadImage'),
                  instagramHint: t('instagramHint'),
                  preparing: t('preparing'),
                }}
              />
            )}

            <Link
              href="/download"
              className="mt-8 block text-center text-white/90 underline underline-offset-4 font-medium"
            >
              {t('getApp')}
            </Link>
          </div>
        </main>

        <PageFooter />
      </div>
    </div>
  );
}
