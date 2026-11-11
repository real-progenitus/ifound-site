'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import { MAX_CV_BYTES } from '@/lib/jobs';
import { DIAL_CODES, flagEmoji, parsePhone, type PhoneCountryOption } from '@/lib/phone';
import { sendJobApplication } from '../../../actions/sendJobApplication';

type ErrorKey = 'errorRequired' | 'errorEmail' | 'errorPhone' | 'errorLink' | 'errorFileTooLarge' | 'errorFileType' | 'errorRateLimited' | 'errorGeneric';

const inputClass =
  'w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]';

interface Props {
  slug: string;
  defaultCountry: string;
  /** From `phoneCountryOptions` on the server; see there for why. */
  countries: PhoneCountryOption[];
}

export default function JobApplicationForm({ slug, defaultCountry, countries }: Props) {
  const t = useTranslations('jobs');
  const [phoneCountry, setPhoneCountry] = useState(defaultCountry);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSent(false);
    setError(null);

    const required = ['firstName', 'lastName', 'email', 'phone', 'country', 'message'];
    if (required.some((key) => !String(formData.get(key) ?? '').trim()) || formData.get('consent') !== 'on') {
      setError('errorRequired');
      return;
    }
    if (!parsePhone(phoneCountry, String(formData.get('phone')))) {
      setError('errorPhone');
      return;
    }
    // Checked here too so a big file fails fast instead of after the upload.
    const cv = formData.get('cv');
    if (cv instanceof File && cv.size > MAX_CV_BYTES) {
      setError('errorFileTooLarge');
      return;
    }

    setSending(true);
    try {
      const result = await sendJobApplication(formData);
      if (result.success) {
        setSent(true);
        form.reset();
      } else if (result.code === 'invalid_email') {
        setError('errorEmail');
      } else if (result.code === 'invalid_phone') {
        setError('errorPhone');
      } else if (result.code === 'invalid_link') {
        setError('errorLink');
      } else if (result.code === 'file_too_large') {
        setError('errorFileTooLarge');
      } else if (result.code === 'file_invalid') {
        setError('errorFileType');
      } else if (result.code === 'rate_limited') {
        setError('errorRateLimited');
      } else if (result.code === 'invalid_input') {
        setError('errorRequired');
      } else {
        setError('errorGeneric');
      }
    } catch {
      // A body over the platform limit never reaches the action and rejects here.
      setError('errorGeneric');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-lg p-8 text-black">
      <h2 className="text-2xl font-black mb-6">{t('applyTitle')}</h2>

      {error && (
        <div role="alert" className="mb-6 bg-red-500 text-white px-6 py-4 rounded-lg">
          <p className="font-semibold">{t('errorTitle')}</p>
          <p className="text-sm">{t(error)}</p>
        </div>
      )}

      {sent && (
        <div role="status" className="mb-6 bg-[#38B6FF] text-white px-6 py-4 rounded-lg">
          <p className="font-semibold">{t('successTitle')}</p>
          <p className="text-sm">{t('successMessage')}</p>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="slug" value={slug} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold mb-2">{t('firstName')} *</label>
            <input id="firstName" name="firstName" type="text" autoComplete="given-name" maxLength={100} className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold mb-2">{t('lastName')} *</label>
            <input id="lastName" name="lastName" type="text" autoComplete="family-name" maxLength={100} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">{t('email')} *</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={320} className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold mb-2">{t('phone')} *</label>
            <div className="flex gap-2">
              {/* A native select keeps the phone's own picker on mobile; it sits
                  invisibly over a compact "🇵🇹 +351" face, since an option's
                  full "Portugal (+351)" text would crowd the number field. */}
              <div className="relative shrink-0">
                <select
                  name="phoneCountry"
                  aria-label={t('phoneCountry')}
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="peer absolute inset-0 w-full opacity-0 cursor-pointer"
                >
                  {countries.map(({ cc, code, name }) => (
                    <option key={cc} value={cc}>
                      {flagEmoji(cc)} {name} (+{code})
                    </option>
                  ))}
                </select>
                <div
                  aria-hidden="true"
                  className="h-full flex items-center gap-1.5 px-3 bg-gray-100 rounded whitespace-nowrap peer-focus-visible:ring-2 peer-focus-visible:ring-[#38B6FF]"
                >
                  <span>{flagEmoji(phoneCountry)}</span>
                  <span>+{DIAL_CODES[phoneCountry]}</span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={40}
                className={`${inputClass} min-w-0`}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-semibold mb-2">{t('country')} *</label>
          {/* Uncontrolled so form.reset() returns it to the visitor's country. */}
          <select id="country" name="country" autoComplete="country" defaultValue={defaultCountry} className={inputClass}>
            {countries.map(({ cc, name }) => (
              <option key={cc} value={cc}>
                {flagEmoji(cc)} {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="linkedin" className="block text-sm font-semibold mb-2">{t('linkedin')}</label>
          <input id="linkedin" name="linkedin" type="url" placeholder="https://" maxLength={500} className={inputClass} />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold mb-2">{t('message')} *</label>
          <textarea id="message" name="message" rows={6} maxLength={5000} className={`${inputClass} resize-none`} />
        </div>

        <div>
          <label htmlFor="cv" className="block text-sm font-semibold mb-2">{t('cv')}</label>
          <input
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm text-gray-700 file:mr-4 file:px-4 file:py-2 file:rounded file:border-0 file:bg-gray-100 file:font-semibold hover:file:bg-gray-200"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-[#38B6FF]" />
          <span>
            {t.rich('consent', {
              link: (chunks) => (
                <Link href="/privacy" target="_blank" className="text-[#38B6FF] underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        <button
          type="submit"
          disabled={sending}
          className="w-full md:w-auto px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors disabled:opacity-60"
        >
          {sending ? t('sending') : t('submit')}
        </button>
      </form>
    </div>
  );
}
