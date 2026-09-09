'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import MobileNav from './MobileNav';
import LanguageSwitcher from './LanguageSwitcher';
import { useShopEnabled } from './ShopAvailability';

/**
 * The site's top navigation, desktop and mobile.
 *
 * Extracted because the same two blocks were hand-copied into eight page files
 * and had already drifted: only the home page rendered the language switcher,
 * the alignment differed between pages, and "Map" was a hardcoded English
 * string outside the nav translation namespace. Adding one link meant editing
 * eight files and getting all eight right.
 *
 * It owns the Shop link, so it is the one place that has to know whether the
 * shop is open. A closed shop drops the link entirely rather than leading
 * people to a dead page — the kill switch has to actually remove the shop from
 * the site. The flag arrives through context because two of the pages that
 * render this nav are client components; see ShopAvailability.tsx.
 *
 * The logo uses the locale-aware Link rather than the plain anchor inside the
 * Logo component. Seven pages used Logo, whose bare href="/" dropped a visitor
 * on the English home page whatever locale they were reading in; only the home
 * page had it right. Extracting settles it in the correct direction.
 */
export interface NavLink {
  href: string;
  label: string;
}

export default function SiteNav({
  links,
  align = 'center',
}: {
  /** The page's own links, minus itself. The Shop link is appended here. */
  links: NavLink[];
  /**
   * Pages whose nav sits beside a tall heading use 'start' so the links line up
   * with the first line of text rather than floating mid-block.
   */
  align?: 'start' | 'center';
}) {
  const nav = useTranslations('nav');
  const shopEnabled = useShopEnabled();

  const allLinks: NavLink[] = shopEnabled
    ? [...links, { href: '/shop', label: nav('shop') }]
    : links;

  return (
    <>
      <MobileNav links={allLinks} />

      <Link
        href="/"
        className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-center gap-1"
      >
        <img
          src="/favicon.png"
          alt="Logo"
          width={80}
          height={80}
          className="object-contain"
        />
        <span className="text-white text-3xl font-semibold">ifound</span>
      </Link>

      {/* Tailwind only sees literal class names, so these cannot be interpolated. */}
      <div
        className={
          align === 'start'
            ? 'hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start'
            : 'hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-center'
        }
      >
        {allLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-white text-base font-medium hover:text-white/80 transition-colors"
          >
            {link.label}
          </Link>
        ))}
        <LanguageSwitcher />
      </div>
    </>
  );
}
