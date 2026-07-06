import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const DEFAULT_CONFIG = {
  apiKey: "AIzaSyCk1un041W7tOch52De1dXGz-QrcWTjHuc",
  authDomain: "jeetracker-a6c9b.firebaseapp.com",
  projectId: "jeetracker-a6c9b",
  storageBucket: "jeetracker-a6c9b.firebasestorage.app",
  messagingSenderId: "559150749766",
  appId: "1:559150749766:web:f6ee52620c88d04b635247",
  measurementId: "G-06VLVJDT92"
};

let config = { ...DEFAULT_CONFIG };

try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_FIREBASE_API_KEY) config.apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) config.authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      config.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    }
    if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) config.storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    if (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) config.messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    if (import.meta.env.VITE_FIREBASE_APP_ID) config.appId = import.meta.env.VITE_FIREBASE_APP_ID;
    if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) config.measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  }
} catch (e) {
  console.warn("Failed to read environment config, using defaults:", e);
}

import appletConfig from '../../firebase-applet-config.json';

const isUsingDefaultProject = config.projectId === "innate-pursuit-8r5vm";

const app = initializeApp(config);

// Determine the correct Firestore database ID from the applet configuration
const dbId = appletConfig.firestoreDatabaseId || (import.meta.env ? (import.meta.env as any).VITE_FIREBASE_DATABASE_ID : undefined) || (isUsingDefaultProject ? "ai-studio-jeepreptracker-97c389bb-a22c-4b2a-84b6-3b781058b444" : undefined);

const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

const auth = getAuth(app);

// Region must match the `region` set on the syncEdofox Cloud Function
// (functions/src/index.ts) — a mismatch here causes silent 404s.
// NOTE: no longer used for Edofox sync — that moved to a Cloudflare Worker
// (see src/lib/edofoxWorker.ts and /cf-worker) to avoid requiring Firebase's
// paid Blaze plan. Left exported here in case some other feature needs a
// callable Cloud Function in the future.
const functions = getFunctions(app, 'asia-south1');

export { db, auth, functions };
