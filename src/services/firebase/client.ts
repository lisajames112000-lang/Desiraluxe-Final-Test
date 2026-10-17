import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { resolveFirebaseConfig, type FirebaseConfigSource } from './config';

interface FirebaseClient {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  configured: boolean;
  configurationError: string | null;
  configurationSource: FirebaseConfigSource;
}

function unavailable(error: string, configurationSource: FirebaseConfigSource): FirebaseClient {
  return {
    app: null,
    auth: null,
    db: null,
    configured: false,
    configurationError: error,
    configurationSource
  };
}

function createClient(): FirebaseClient {
  const resolved = resolveFirebaseConfig();
  if (!resolved.config) {
    return unavailable(resolved.error || 'Firebase public Web configuration is unavailable.', resolved.source);
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(resolved.config);
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      configured: true,
      configurationError: null,
      configurationSource: resolved.source
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown initialization error';
    return unavailable(`Firebase could not be initialized: ${detail}`, resolved.source);
  }
}

export const firebaseClient = createClient();