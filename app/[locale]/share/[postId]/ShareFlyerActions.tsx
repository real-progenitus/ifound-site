'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faWhatsapp, faXTwitter } from '@fortawesome/free-brands-svg-icons';

type Format = 'feed' | 'story';

const noopSubscribe = () => () => {};

type Labels = {
  shareFlyer: string;
  formatFeed: string;
  formatStory: string;
  shareOn: string;
  copyLink: string;
  linkCopied: string;
  downloadImage: string;
  instagramHint: string;
  preparing: string;
};

/**
 * Share controls for a post's flyer.
 *
 * On phones the primary button hands the flyer IMAGE to the native share sheet
 * (`navigator.share({ files })`), which is the only way a web page can put a
 * picture into Instagram, WhatsApp or the Facebook app — Instagram has no web
 * share URL at all. Everywhere else it degrades to sharing the link, whose
 * og:image is the same flyer, plus per-network buttons and a download.
 */
export default function ShareFlyerActions({
  pageUrl,
  shareText,
  feedImagePath,
  storyImagePath,
  labels,
}: {
  pageUrl: string;
  shareText: string;
  /** Same-origin flyer route, or null while the flyer is still rendering. */
  feedImagePath: string | null;
  storyImagePath: string | null;
  labels: Labels;
}) {
  const [format, setFormat] = useState<Format>('feed');
  const [files, setFiles] = useState<Partial<Record<Format, File>>>({});
  const [canShareFiles, setCanShareFiles] = useState(false);
  // false on the server and during hydration, the real capability after.
  const canShareLink = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === 'function',
    () => false
  );
  const [copied, setCopied] = useState(false);

  const imagePath = format === 'story' && storyImagePath ? storyImagePath : feedImagePath;

  // Fetch the image ahead of the tap: Safari only allows share() during the
  // tap's user activation, which a slow fetch inside the handler would outlive.
  useEffect(() => {
    if (!imagePath || files[format]) return;
    let cancelled = false;
    fetch(imagePath)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const file = new File([blob], `ifound-flyer-${format}.jpg`, { type: 'image/jpeg' });
        setFiles((prev) => ({ ...prev, [format]: file }));
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          setCanShareFiles(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [imagePath, format, files]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions): nothing to recover.
    }
  };

  const handleShare = async () => {
    const file = files[format];
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText} ${pageUrl}` });
        return;
      }
      if (typeof navigator.share === 'function') {
        await navigator.share({ text: shareText, url: pageUrl });
        return;
      }
    } catch (err) {
      // The user closing the sheet is not an error.
      if ((err as DOMException)?.name === 'AbortError') return;
    }
    await copyLink();
  };

  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(shareText);
  const networks = [
    {
      label: 'Facebook',
      icon: faFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'WhatsApp',
      icon: faWhatsapp,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${pageUrl}`)}`,
    },
    {
      label: 'X',
      icon: faXTwitter,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
  ];

  return (
    <div className="mt-6">
      {feedImagePath && storyImagePath && (
        <div className="flex justify-center gap-2 mb-4" role="radiogroup">
          {(['feed', 'story'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                format === f ? 'bg-white text-[#0c6fa6]' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {f === 'feed' ? labels.formatFeed : labels.formatStory}
            </button>
          ))}
        </div>
      )}

      {(canShareFiles || canShareLink) && (
        <button
          type="button"
          onClick={handleShare}
          className="w-full bg-white text-[#0c6fa6] font-bold text-lg rounded-xl py-4 shadow-lg active:scale-[0.99] transition-transform"
        >
          {labels.shareFlyer}
        </button>
      )}

      {!feedImagePath && <p className="text-center text-white/80 text-sm mt-3">{labels.preparing}</p>}
      {feedImagePath && !canShareFiles && (
        <p className="text-center text-white/80 text-sm mt-3">{labels.instagramHint}</p>
      )}

      <p className="text-center text-white/80 text-sm mt-6 mb-3">{labels.shareOn}</p>
      <div className="flex justify-center gap-3">
        {networks.map(({ label, icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={icon} className="w-5 h-5" />
          </a>
        ))}
      </div>

      <div className="flex flex-col min-[400px]:flex-row gap-3 mt-6">
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-3 font-medium transition-colors"
        >
          {copied ? labels.linkCopied : labels.copyLink}
        </button>
        {imagePath && (
          <a
            href={`${imagePath}&download=1`}
            className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-3 font-medium text-center transition-colors"
          >
            {labels.downloadImage}
          </a>
        )}
      </div>
    </div>
  );
}
