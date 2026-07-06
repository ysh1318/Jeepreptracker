// Client-side wrapper for the Edofox sync worker.
//
// This replaces the old Firebase Cloud Functions callables (`syncEdofox`,
// `syncEdofoxStored`) with plain HTTPS calls to a Cloudflare Worker, so the
// project doesn't require Firebase's paid Blaze plan just to run this one
// piece of server-side logic. See /cf-worker in the project root for the
// Worker source and DEPLOY.md for setup.
//
// The Worker never touches Firestore directly — it only does the Edofox
// login/scrape/encrypt-or-decrypt work and hands the result back. The
// client (which already has its own Firestore read/write access via the
// existing security rules) is responsible for persisting the result, the
// same as it already did with the old callables' return values.

import { auth } from './firebase';

// Set after deploying the Worker (see /cf-worker/DEPLOY.md). Looks like:
//   https://jee-edofox-sync.<your-subdomain>.workers.dev
// Configure via a Vite env var so this isn't hardcoded per-environment:
//   VITE_EDOFOX_WORKER_URL=https://jee-edofox-sync.yoursubdomain.workers.dev
const WORKER_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EDOFOX_WORKER_URL) || '';

type SyncResult = {
  success: boolean;
  studentInfo?: any;
  tests?: any[];
  credentialsEnc?: { iv: string; tag: string; data: string };
  error?: string;
};

async function callWorker(path: string, body: any): Promise<SyncResult> {
  if (!WORKER_URL) {
    return {
      success: false,
      error: 'Edofox sync worker URL is not configured. Set VITE_EDOFOX_WORKER_URL and rebuild.'
    };
  }

  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'You must be signed in to sync Edofox data.' };
  }

  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch (e: any) {
    return { success: false, error: 'Could not verify your session — please sign in again.' };
  }

  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(body)
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // fall through — data stays null, handled below
    }

    if (!res.ok) {
      return { success: false, error: data?.error || `Sync request failed (status ${res.status})` };
    }
    return data as SyncResult;
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error contacting the sync worker.' };
  }
}

/**
 * Interactive verification (onboarding, re-verifying after a password
 * change). The client necessarily holds the plaintext password at that
 * moment because the person just typed it in — same trust boundary as any
 * login form. Returns a `credentialsEnc` blob to store in Firestore instead
 * of the raw password.
 */
export function syncEdofoxInteractive(username: string, password: string): Promise<SyncResult> {
  return callWorker('/sync-interactive', { username, password });
}

/**
 * Routine re-sync once credentials are already linked. The client passes its
 * own already-stored `credentialsEnc` (read from its own Firestore student
 * doc, which it already has access to) — the plaintext password is never
 * held by the client for this path; only the Worker (holding the secret
 * key) can decrypt it.
 */
export function syncEdofoxStored(username: string, credentialsEnc: any): Promise<SyncResult> {
  return callWorker('/sync-stored', { username, credentialsEnc });
}
