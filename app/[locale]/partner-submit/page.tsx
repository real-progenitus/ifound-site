'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/routing';
import MobileNav from '../../components/MobileNav';
import PageFooter from '../../components/PageFooter';
import Logo from '../../components/Logo';

// Must stay in sync with the server-side CATEGORY_ALLOWLIST in
// app/api/partner-submit/route.ts and with the `map.categories` keys in
// messages/*.json.
const CATEGORY_KEYS = [
  'other',
  'electronics',
  'phones',
  'glasses',
  'keys',
  'pets',
  'persons',
  'clothes',
  'vehicles',
  'wallets',
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const MAX_IMAGES = 3;
const TARGET_BYTES = 1 * 1024 * 1024; // compress down to 1 MB
const MAX_DIMENSION = 1920; // px — scale down very large images before compressing

/**
 * Compress an image file client-side using the Canvas API.
 * Scales down to MAX_DIMENSION on the longest side, then reduces JPEG quality
 * in 0.1 steps until the output is ≤ TARGET_BYTES or quality hits 0.1.
 * Returns a new File (always JPEG) with the compressed data.
 * If the image is already small enough, returns the original File unchanged.
 */
async function compressImage(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryNext = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            if (blob.size <= TARGET_BYTES || quality <= 0.1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              quality = parseFloat((quality - 0.1).toFixed(1));
              tryNext();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryNext();
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

interface ImageEntry {
  /** Stable client-side id used as React key + remove handle. */
  id: string;
  file: File;
  previewUrl: string;
}

export default function PartnerSubmit() {
  const t = useTranslations('partnerSubmit');
  const tMap = useTranslations('map');
  const nav = useTranslations('nav');
  const locale = useLocale();

  const [title, setTitle] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [images, setImages] = useState<ImageEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function flashError(msg: string) {
    setErrorMessage(msg);
    setShowError(true);
    setTimeout(() => setShowError(false), 10000);
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const slotsLeft = MAX_IMAGES - images.length;
    if (slotsLeft <= 0) {
      flashError(t('tooManyImages'));
      return;
    }
    if (incoming.length > slotsLeft) {
      flashError(t('tooManyImages'));
    }
    const candidates = incoming.slice(0, slotsLeft);
    for (const file of candidates) {
      if (!file.type.startsWith('image/')) {
        flashError(t('invalidImageType'));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }
    setCompressing(true);
    try {
      const accepted: ImageEntry[] = [];
      for (const file of candidates) {
        const compressed = await compressImage(file);
        accepted.push({
          id: `${compressed.name}-${compressed.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file: compressed,
          previewUrl: URL.createObjectURL(compressed),
        });
      }
      setImages((prev) => [...prev, ...accepted]);
    } catch {
      flashError(t('errorMessage'));
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function resetForm() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setTitle('');
    setPartnerName('');
    setDescription('');
    setCategory('');
    setImages([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !description.trim() || !category) {
      flashError(t('errorMessage'));
      return;
    }
    if (images.length === 0) {
      flashError(t('errorMessage'));
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('title', title.trim());
      formData.set('partnerName', partnerName.trim());
      formData.set('description', description.trim());
      formData.set('category', category);
      formData.set('locale', locale);
      for (const img of images) {
        formData.append('images', img.file, img.file.name);
      }

      const res = await fetch('/api/partner-submit', {
        method: 'POST',
        body: formData,
      });

      // Server returns the standard PartnerEmailResult-style shape on both
      // success and error.
      const result = (await res.json().catch(() => null)) as
        | { success: boolean; error?: string; code?: string }
        | null;

      if (!res.ok || !result?.success) {
        flashError(result?.error ?? t('errorMessage'));
        return;
      }

      resetForm();
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 10000);
    } catch (err) {
      console.error('[partner-submit] submission failed', err);
      flashError(t('errorMessage'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav
          links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: nav('aboutUs') },
            { href: '/privacy', label: nav('privacyPolicy') },
          ]}
        />

        {/* Desktop Logo */}
        <Logo className="hidden min-[600px]:flex absolute top-4 left-8 z-10" />

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">
            {nav('aboutUs')}
          </Link>
          <Link href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">
            {nav('privacyPolicy')}
          </Link>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">
              {t('title')}
            </h1>
            <div className="text-lg leading-relaxed space-y-4">
              <p>{t('intro')}</p>
            </div>

            {/* Submission Form */}
            <div className="mt-12 bg-white rounded-lg p-8 text-black relative">
              <h2 className="text-2xl font-black mb-6">{t('formTitle')}</h2>

              {/* Error Notification */}
              {showError && (
                <div className="mb-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 animate-slide-in">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('errorTitle')}</p>
                    <p className="text-sm">{errorMessage ?? t('errorMessage')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowError(false)}
                    className="ml-4 hover:bg-red-600 rounded p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Success Notification */}
              {showNotification && (
                <div className="mb-6 bg-[#38B6FF] text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 animate-slide-in">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('successTitle')}</p>
                    <p className="text-sm">{t('successMessage')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotification(false)}
                    className="ml-4 hover:bg-[#2FA5EE] rounded p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                {/* Title */}
                <div>
                  <label htmlFor="ps-title" className="block text-sm font-semibold mb-2">
                    {t('titleLabel')}
                  </label>
                  <input
                    type="text"
                    id="ps-title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Partner Name */}
                <div>
                  <label htmlFor="ps-partner-name" className="block text-sm font-semibold mb-2">
                    {t('partnerNameLabel')}
                  </label>
                  <input
                    type="text"
                    id="ps-partner-name"
                    name="partnerName"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    maxLength={100}
                    placeholder={t('partnerNamePlaceholder')}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="ps-category" className="block text-sm font-semibold mb-2">
                    {t('categoryLabel')}
                  </label>
                  <select
                    id="ps-category"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryKey | '')}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  >
                    <option value="" disabled>
                      {t('categoryPlaceholder')}
                    </option>
                    {CATEGORY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {tMap(`categories.${key}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="ps-description" className="block text-sm font-semibold mb-2">
                    {t('descriptionLabel')}
                  </label>
                  <textarea
                    id="ps-description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] resize-none"
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t('imagesLabel')}
                  </label>
                  <p className="text-xs text-gray-600 mb-3">{t('imagesHint')}</p>

                  {/* Previews */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square rounded overflow-hidden bg-gray-100 ring-1 ring-gray-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.previewUrl}
                            alt={img.file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                            aria-label="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    disabled={images.length >= MAX_IMAGES || compressing || submitting}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#38B6FF] file:text-white hover:file:bg-[#2FA5EE] file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {compressing && (
                    <p className="text-xs text-[#38B6FF] mt-2">{t('compressing')}</p>
                  )}
                </div>

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    disabled={submitting || compressing}
                    className="w-full md:w-auto px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? t('submitting') : compressing ? t('compressing') : t('submitButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* White Section */}
      <section className="w-full bg-white py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/about" className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors">
              {nav('aboutUs')}
            </Link>
            <Link href="/privacy" className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors">
              {nav('privacyPolicy')}
            </Link>
            <Link href="/partner" className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors">
              {nav('becomePartner')}
            </Link>
            <Link href="/contact" className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors">
              {nav('contacts')}
            </Link>
            <Link href="/faqs" className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors">
              {nav('faqs')}
            </Link>
          </div>
        </div>
      </section>
      <PageFooter />
    </div>
  );
}
