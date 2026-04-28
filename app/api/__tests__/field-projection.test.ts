/**
 * Integration test for M5 (Firestore field projection).
 *
 * The web app uses the Firebase Admin SDK, which bypasses Firestore Security
 * Rules entirely. That means our only wall between raw Firestore documents
 * and the public internet is the per-route projection we do in each handler.
 *
 * This test pins that contract: for every public GET route, we mock Firestore
 * to return documents *loaded with poison fields* (sentinel names that
 * resemble PII / internal metadata) and then assert:
 *
 *   1. None of the poison fields appear anywhere in the response.
 *   2. The response payload contains exactly the whitelisted field set
 *      we have agreed to expose — no more, no less.
 *
 * If someone adds a new field to a handler response (even unintentionally,
 * e.g. by doing `NextResponse.json(doc.data())` or spreading `...d`), this
 * test fails loudly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------- Mocks ----------

// Allow-all guard: the guard itself has its own tests; here we want to exercise
// the projection logic end-to-end without needing Redis / origin headers.
vi.mock('@/lib/api-guard', () => ({
  guardApiRequest: vi.fn(async () => null),
}));

// Silence logger output in test runs.
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Stub Firestore. Each test replaces `mockCollections` with the shape it needs.
type FakeDoc = { id: string; data: Record<string, unknown> };
const mockCollections: Record<string, FakeDoc[]> = {};

function fakeSnapshot(docs: FakeDoc[]) {
  const wrapped = docs.map((d) => ({
    id: d.id,
    data: () => d.data,
  }));
  return { docs: wrapped, size: wrapped.length };
}

function makeQueryStub(docs: FakeDoc[]) {
  const stub = {
    where: () => stub,
    orderBy: () => stub,
    limit: () => stub,
    get: async () => fakeSnapshot(docs),
  };
  return stub;
}

vi.mock('@/lib/firebase-admin', () => ({
  db: () => ({
    collection: (name: string) => {
      const docs = mockCollections[name] ?? [];
      return {
        ...makeQueryStub(docs),
        doc: (docId: string) => {
          const found = docs.find((d) => d.id === docId);
          return {
            get: async () => ({
              exists: !!found,
              data: () => found?.data,
            }),
          };
        },
        get: async () => fakeSnapshot(docs),
      };
    },
  }),
}));

// ---------- Helpers ----------

/** Fields we use to detect accidental full-document passthrough. */
const POISON_FIELDS: Record<string, unknown> = {
  userId: 'user_sentinel_12345',
  ownerUid: 'uid_sentinel_12345',
  email: 'leak@example.com',
  phoneNumber: '+15551234567',
  internalNotes: 'should never leak',
  moderationStatus: 'SECRET',
  fcmTokens: ['tok_sentinel'],
  ipAddress: '10.0.0.1',
  deviceId: 'device_sentinel',
  __rawInternal: { anything: true },
};

/** Walk an arbitrary JSON value and return every key + every scalar value seen. */
function collectKeysAndValues(value: unknown): {
  keys: Set<string>;
  scalars: Set<string>;
} {
  const keys = new Set<string>();
  const scalars = new Set<string>();
  const visit = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === 'object') {
      for (const [k, nested] of Object.entries(v as Record<string, unknown>)) {
        keys.add(k);
        visit(nested);
      }
      return;
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      scalars.add(String(v));
    }
  };
  visit(value);
  return { keys, scalars };
}

/** Assert that no poison key name or poison value string leaked into `body`. */
function assertNoPoisonLeak(body: unknown) {
  const { keys, scalars } = collectKeysAndValues(body);
  for (const poisonKey of Object.keys(POISON_FIELDS)) {
    expect(
      keys.has(poisonKey),
      `Poison field "${poisonKey}" leaked into response`
    ).toBe(false);
  }
  const poisonStringValues = [
    'user_sentinel_12345',
    'uid_sentinel_12345',
    'leak@example.com',
    '+15551234567',
    'should never leak',
    'SECRET',
    'tok_sentinel',
    '10.0.0.1',
    'device_sentinel',
  ];
  for (const val of poisonStringValues) {
    expect(
      scalars.has(val),
      `Poison value "${val}" leaked into response`
    ).toBe(false);
  }
}

function req(path: string): NextRequest {
  // NextRequest needs a full URL; the handlers only care about the query string.
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  for (const k of Object.keys(mockCollections)) delete mockCollections[k];
  // Route modules cache Firestore results at module scope; reset the module
  // registry so each test gets a fresh cache and sees its own mocked data.
  vi.resetModules();
});

// ---------- /api/map-posts ----------

describe('GET /api/map-posts', () => {
  // Exact whitelist we have agreed to expose from a Posts document.
  const ALLOWED_POST_FIELDS = new Set([
    'id',
    'title',
    'description',
    'category',
    'type',
    'address',
    'reward',
    'currency',
    'images',
    'timestamp',
    'isResolved',
    'isPromoted',
    'latitude',
    'longitude',
    'partnerLocationId',
  ]);

  it('projects only whitelisted fields and drops poison fields', async () => {
    mockCollections.Posts = [
      {
        id: 'post_a',
        data: {
          ...POISON_FIELDS,
          title: 'Lost wallet',
          description: 'Black leather',
          category: 'wallet',
          type: 'lost',
          address: 'Lisbon',
          reward: 50,
          currency: 'EUR',
          images: ['https://example.com/a.jpg'],
          timestamp: Date.now(),
          isResolved: false,
          isDeleted: false,
          pinLocation: { latitude: 38.7, longitude: -9.1 },
          promotion: { tier: 'max_exposure', status: 'active' },
        },
      },
      {
        id: 'post_deleted_account',
        data: {
          ...POISON_FIELDS,
          accountWasDeleted: true,
          pinLocation: { latitude: 1, longitude: 1 },
          timestamp: Date.now(),
        },
      },
    ];

    const { GET } = await import('@/app/api/map-posts/route');
    const res = await GET(req('/api/map-posts'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1); // deleted-account entry must be dropped

    const post = body[0];
    expect(new Set(Object.keys(post))).toEqual(ALLOWED_POST_FIELDS);
    expect(post.isPromoted).toBe(true);
    assertNoPoisonLeak(body);
  });

  it('filters by viewport bounds without leaking extra fields', async () => {
    mockCollections.Posts = [
      {
        id: 'in_bounds',
        data: {
          ...POISON_FIELDS,
          title: 'in',
          pinLocation: { latitude: 10, longitude: 10 },
          timestamp: Date.now(),
          isDeleted: false,
          isResolved: false,
        },
      },
      {
        id: 'out_of_bounds',
        data: {
          ...POISON_FIELDS,
          title: 'out',
          pinLocation: { latitude: 80, longitude: 80 },
          timestamp: Date.now(),
          isDeleted: false,
          isResolved: false,
        },
      },
    ];

    const { GET } = await import('@/app/api/map-posts/route');
    const res = await GET(
      req('/api/map-posts?north=20&south=0&east=20&west=0')
    );
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].id).toBe('in_bounds');
    for (const p of body) {
      expect(new Set(Object.keys(p))).toEqual(ALLOWED_POST_FIELDS);
    }
    assertNoPoisonLeak(body);
  });
});

// ---------- /api/partner-locations ----------

describe('GET /api/partner-locations', () => {
  const ALLOWED_PARTNER_FIELDS = new Set([
    'id',
    'title',
    'logoUrl',
    'contact',
    'partnerId',
    'latitude',
    'longitude',
  ]);

  it('projects only whitelisted fields and drops poison fields', async () => {
    mockCollections.PartnerLocations = [
      {
        id: 'partner_1',
        data: {
          ...POISON_FIELDS,
          title: 'Partner One',
          logoUrl: 'https://example.com/logo.png',
          contact: 'contact@partner.example',
          partnerId: 'p-1',
          isActive: true,
          isDeleted: false,
          pinLocation: {
            latitude: 38.7,
            longitude: -9.1,
            __extraNested: POISON_FIELDS, // must not leak either
          },
        },
      },
    ];

    const { GET } = await import('@/app/api/partner-locations/route');
    const res = await GET(req('/api/partner-locations'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.length).toBe(1);
    const loc = body[0];
    expect(new Set(Object.keys(loc))).toEqual(ALLOWED_PARTNER_FIELDS);
    assertNoPoisonLeak(body);
  });
});

// ---------- /api/counters ----------

describe('GET /api/counters', () => {
  const ALLOWED_COUNTER_FIELDS = new Set(['lost', 'found']);

  it('returns only {lost, found} totals and drops poison fields', async () => {
    mockCollections.Dynamic = [
      {
        id: 'total_counters',
        data: {
          ...POISON_FIELDS,
          regionA: { wallet: 3, phone: 2, poisonKey: 'SECRET' },
          regionB: { wallet: 1 },
          updatedAt: Date.now(),
        },
      },
    ];

    const { GET } = await import('@/app/api/counters/route');
    const res = await GET(req('/api/counters'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(new Set(Object.keys(body))).toEqual(ALLOWED_COUNTER_FIELDS);
    expect(body.lost).toBe(6); // 3 + 2 + 1, non-numeric "poisonKey" ignored
    expect(body.found).toBe(0);
    assertNoPoisonLeak(body);
  });
});

// ---------- /api/region-counters ----------

describe('GET /api/region-counters', () => {
  const ALLOWED_REGION_FIELDS = new Set(['name', 'bounds', 'counters']);
  const ALLOWED_BOUNDS_FIELDS = new Set(['northEast', 'southWest']);
  const ALLOWED_LATLNG_FIELDS = new Set(['lat', 'lng']);

  it('projects only whitelisted region fields and strips non-numeric counters', async () => {
    mockCollections.Dynamic = [
      {
        id: 'pt_boundaries',
        data: {
          ...POISON_FIELDS,
          updatedAt: Date.now(),
          lisboa: {
            name: 'Lisboa',
            // Extra region-level fields that must not leak through.
            internalOwnerId: 'owner_sentinel',
            ...POISON_FIELDS,
            bounds: {
              northEast: {
                lat: 39,
                lng: -8,
                extra: 'SECRET',
              },
              southWest: {
                lat: 38,
                lng: -10,
                extra: 'SECRET',
              },
            },
            counters: {
              wallet: 3,
              phone: 2,
              // Non-numeric entries must be stripped.
              leakedString: 'SECRET',
              leakedNested: { userId: 'user_sentinel_12345' },
            },
          },
        },
      },
    ];

    const { GET } = await import('@/app/api/region-counters/route');
    const res = await GET(req('/api/region-counters'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.length).toBe(1);
    const region = body[0];
    expect(new Set(Object.keys(region))).toEqual(ALLOWED_REGION_FIELDS);
    expect(new Set(Object.keys(region.bounds))).toEqual(ALLOWED_BOUNDS_FIELDS);
    expect(new Set(Object.keys(region.bounds.northEast))).toEqual(
      ALLOWED_LATLNG_FIELDS
    );
    expect(new Set(Object.keys(region.bounds.southWest))).toEqual(
      ALLOWED_LATLNG_FIELDS
    );
    expect(region.counters).toEqual({ wallet: 3, phone: 2 });
    assertNoPoisonLeak(body);
  });
});
