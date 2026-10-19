import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { JOBS, getJob, openJobs, pick, type Localized } from '../jobs';

// The site's languages, one messages file each. Read from disk rather than
// importing routing.ts, which pulls in next-intl's navigation runtime.
const LOCALES = readdirSync(path.join(__dirname, '../../messages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

/** Every Localized value in a job, with a path for the failure message. */
function localizedFields(job: (typeof JOBS)[number]): [string, Localized][] {
  const out: [string, Localized][] = [];
  for (const [key, value] of Object.entries(job)) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => out.push([`${key}[${i}]`, item]));
    } else if (value && typeof value === 'object') {
      out.push([key, value as Localized]);
    }
  }
  return out;
}

describe('JOBS config', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = JOBS.map((j) => j.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it.each(JOBS.map((j) => [j.slug, j] as const))('%s has text in every site language', (_slug, job) => {
    expect(LOCALES.length).toBeGreaterThan(1);
    for (const [field, text] of localizedFields(job)) {
      for (const locale of LOCALES) {
        const value = (text as Record<string, string | undefined>)[locale];
        expect(value?.trim(), `${field}.${locale}`).toBeTruthy();
      }
    }
  });
});

describe('helpers', () => {
  it('getJob finds by slug and openJobs filters closed ones', () => {
    for (const job of JOBS) expect(getJob(job.slug)).toBe(job);
    expect(getJob('does-not-exist')).toBeUndefined();
    expect(openJobs().every((j) => j.open)).toBe(true);
  });

  it('pick returns the locale\'s text, falling back to English for an unknown locale', () => {
    const text = Object.fromEntries(LOCALES.map((l) => [l, `text-${l}`])) as Localized;
    for (const locale of LOCALES) expect(pick(text, locale)).toBe(`text-${locale}`);
    expect(pick(text, 'xx')).toBe('text-en');
  });
});
