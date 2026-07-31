import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";

// ── Environment variable validation ──────────────────────────────────────────
// All VITE_ variables are inlined at build time (Vite replaces them with their
// literal values). They are intentionally public — the security boundary is
// Firestore Security Rules + Firebase Auth, NOT the API key itself.
//
// We validate here so a misconfigured deployment surfaces an obvious error
// instead of a confusing runtime failure deep inside the Firebase SDK.
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^your-/i,
  /placeholder/i,
  /example/i,
  /changeme/i,
  /^xxx/i,
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function validateEnv() {
  const missing = [];
  const placeholders = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = import.meta.env[key];
    if (!value) {
      missing.push(key);
    } else if (isPlaceholder(value)) {
      placeholders.push(key);
    }
  }

  if (missing.length > 0 || placeholders.length > 0) {
    const lines = [
      "🔴 Firebase is not configured correctly.",
      "",
    ];
    if (missing.length > 0) {
      lines.push(`  Missing variables:     ${missing.join(", ")}`);
    }
    if (placeholders.length > 0) {
      lines.push(`  Placeholder values:    ${placeholders.join(", ")}`);
    }
    lines.push("", "  Copy .env.example → .env and fill in your Firebase project values.");
    lines.push("  Running in local (offline) fallback mode.\n");
    console.warn(lines.join("\n"));
    return false;
  }

  return true;
}

// ── Clears stale Firestore IndexedDB data ─────────────────────────────────────
// When the Firestore SDK version changes, the persisted IndexedDB schema may be
// incompatible. This helper deletes those stale databases so Firestore can
// start fresh with a clean persistent cache — eliminating the console warning.
function clearFirestoreIndexedDB(projectId) {
  if (!("indexedDB" in window)) return Promise.resolve();
  const dbNames = [
    `firestore/[DEFAULT]/${projectId}/main`,
    `firestore/[DEFAULT]/${projectId}/documents`,
    `firestore/[DEFAULT]/${projectId}/mutation_queue`,
    `firestore/[DEFAULT]/${projectId}/remote_document_cache`,
  ];
  return Promise.all(
    dbNames.map(
      (name) =>
        new Promise((resolve) => {
          try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = resolve;
            req.onerror   = resolve; // best-effort: resolve even on error
            req.onblocked = resolve;
          } catch {
            resolve(); // silently swallow
          }
        })
    )
  );
}

// ── Firebase configuration ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app;
let auth;
let db;
let isFirebaseEnabled = false;

const isConfigValid = validateEnv();

if (isConfigValid) {
  try {
    app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);

    // ── Firestore HMR Singleton Cache ───────────────────
    if (import.meta.env.DEV && globalThis.__firebase_db__) {
      db = globalThis.__firebase_db__;
    } else {
      const firestoreOptions = {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
      };

      try {
        db = initializeFirestore(app, {
          ...firestoreOptions,
          localCache: import.meta.env.DEV
            ? memoryLocalCache()
            : persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
              }),
        });
      } catch (cacheError) {
        if (
          cacheError?.code === "failed-precondition" ||
          String(cacheError?.message).includes("persisted data is not compatible")
        ) {
          // Clean databases in the background for next load
          clearFirestoreIndexedDB(firebaseConfig.projectId).catch(() => {});
        }
        // Fall back to getFirestore
        db = getFirestore(app);
      }

      if (import.meta.env.DEV) {
        globalThis.__firebase_db__ = db;
      }
    }

    isFirebaseEnabled = true;
    console.log("Firebase initialised.");
  } catch (error) {
    console.error("Firebase initialisation failed:", error);
  }
} else {
  console.warn(
    "Firebase disabled — running in local-storage fallback mode."
  );
}

export { auth, db, isFirebaseEnabled };
