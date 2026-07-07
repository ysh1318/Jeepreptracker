/**
 * Email normalization function — used consistently across the app
 * and in Firestore security rules to ensure teacher identity checks work
 * for emails with multiple dots (e.g. first.last@gmail.com, a@school.co.in).
 *
 * This must be kept in sync with the normalization logic in firestore.rules
 * (currently lines 32, 38).
 */
export function normalizeEmailForDocId(email: string): string {
  if (!email) return '';
  return email
    .toLowerCase()
    .replace(/@/g, '_')
    .replace(/\./g, '_');
}
