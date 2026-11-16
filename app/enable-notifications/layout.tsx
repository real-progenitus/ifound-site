import { fontClassName } from '../fonts';

/**
 * <html> shell for this non-localized page. The root layout is a pass-through
 * (see app/layout.tsx), so every top-level route outside [locale] that renders
 * a page needs one of these.
 */
export default function EnableNotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontClassName}>{children}</body>
    </html>
  );
}
