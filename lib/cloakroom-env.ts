/**
 * Cloakroom environment gating.
 *
 * The cloakroom intake can target either the live collections or the QA_*
 * collections (which the app in QA mode and the QA cloud callables operate on).
 * The submission page lets a tester opt into QA via a hidden, browser-local
 * toggle (a 12-tap gesture on the logo, persisted in localStorage), so QA can be
 * exercised even on the production deployment. The server therefore honors an
 * `environment: "qa"` request in any environment — it only ever writes to the
 * harmless `QA_*` test collections and still validates the target location.
 */
export type CloakroomEnvironment = "production" | "qa";

/**
 * Resolve the effective environment from a (possibly client-supplied) value.
 * Anything other than an explicit "qa" resolves to production.
 */
export const resolveCloakroomEnvironment = (
  requested?: unknown
): CloakroomEnvironment => (requested === "qa" ? "qa" : "production");

/** Prefix a Firestore collection name with QA_ for the QA environment. */
export const cloakroomCollection = (
  base: string,
  environment: CloakroomEnvironment
): string => (environment === "qa" ? `QA_${base}` : base);
