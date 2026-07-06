/**
 * Tenant / access configuration.
 *
 * IMPORTANT — read before touching this file:
 *
 * 1. DEFAULT_CLASS_ID exists because the app currently supports exactly one
 *    class/institute ("Sant Tukaram Model School"). It was previously
 *    hardcoded as the literal string 'demo_class' in ~20 different places
 *    across App.tsx and Header.tsx — a single typo or partial find/replace
 *    in any one of those would have silently split students across two
 *    "classes". It's centralized here so there's exactly one place to change
 *    when real multi-institute onboarding (institute codes, teacher-created
 *    classes, students joining via invite code) is built.
 *
 *    This is NOT real multi-tenancy yet. Every student in the app today is
 *    still written to the same class document. True multi-tenancy needs a
 *    product decision on how a student/teacher gets assigned a classId
 *    (invite code at signup? institute admin invite? subdomain?) before it
 *    can be wired up — that's an onboarding-flow feature, not a config
 *    change, and shouldn't be faked with a client-side default.
 *
 * 2. ADMIN_EMAIL is safe to keep as a plain constant in client code as long
 *    as it is ALSO enforced in firestore.rules (see /firestore.rules at the
 *    project root). Client-side admin checks are for UI/UX only (deciding
 *    what to render) — they grant no actual access. The real gate is the
 *    security rule that checks request.auth.token.email server-side and
 *    refuses writes to the `role` field from anyone else. Never remove the
 *    rules-side check even if this looks redundant.
 */

export const DEFAULT_CLASS_ID = 'demo_class';

export const ADMIN_EMAIL = 'yashawachar101@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Resolves the classId a given profile belongs to. Falls back to the single
 * default tenant until per-institute assignment exists. Centralizing this
 * (instead of writing `profile?.classId || 'demo_class'` inline everywhere)
 * means the day real assignment ships, this is the only function that needs
 * to change.
 */
export function resolveClassId(profile?: { classId?: string } | null): string {
  return profile?.classId || DEFAULT_CLASS_ID;
}
