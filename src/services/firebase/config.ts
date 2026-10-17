export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type FirebaseConfigSource = 'vite-env' | 'preview-fallback' | 'unconfigured';

export interface ResolvedFirebaseConfig {
  config: FirebasePublicConfig | null;
  source: FirebaseConfigSource;
  error: string | null;
}

declare const __FIREBASE_PUBLIC_CONFIG__: Partial<FirebasePublicConfig> | undefined;

/** The only Firebase project this storefront is allowed to talk to. */
export const EXPECTED_FIREBASE_PROJECT_ID = 'e-commerce-711c0';

const previewFallback: FirebasePublicConfig = {
  // Public Web configuration verified in Firebase Console. These values
  // identify the Firebase Web app; they are not Firebase Admin credentials and
  // do not bypass Firestore Security Rules.
  apiKey: 'AIzaSyBMCNh_3p9SjalAAi2D0eD6GcTCrey87Ok',
  authDomain: 'e-commerce-711c0.firebaseapp.com',
  projectId: EXPECTED_FIREBASE_PROJECT_ID,
  storageBucket: 'e-commerce-711c0.firebasestorage.app',
  messagingSenderId: '716202350085',
  appId: '1:716202350085:web:934d877819f7c4da706e6c'
};

const requiredKeys: Array<keyof FirebasePublicConfig> = [
'apiKey',
'authDomain',
'projectId',
'storageBucket',
'messagingSenderId',
'appId'];


function sanitizeConfig(value: Partial<FirebasePublicConfig> | undefined): Partial<FirebasePublicConfig> {
  if (!value) return {};
  return requiredKeys.reduce<Partial<FirebasePublicConfig>>((result, key) => {
    const entry = typeof value[key] === 'string' ? value[key]?.trim() : '';
    if (entry) result[key] = entry;
    return result;
  }, {});
}

export function resolveFirebaseConfig(override?: Partial<FirebasePublicConfig>): ResolvedFirebaseConfig {
  // Read Vite's native env values so both supported build roots work. The
  // custom define is retained only for backwards-compatible deployments.
  const viteConfig = sanitizeConfig({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  });
  const injectedConfig = sanitizeConfig(
    typeof __FIREBASE_PUBLIC_CONFIG__ === 'undefined' ? undefined : __FIREBASE_PUBLIC_CONFIG__
  );
  const buildConfig = override === undefined
    ? { ...injectedConfig, ...viteConfig }
    : sanitizeConfig(override);
  const combined = { ...sanitizeConfig(previewFallback), ...buildConfig };
  const missing = requiredKeys.filter((key) => !combined[key]);

  if (missing.length > 0) {
    return {
      config: null,
      source: 'unconfigured',
      error: `Firebase is not configured. Missing public Web configuration: ${missing.join(', ')}.`
    };
  }

  const config = combined as FirebasePublicConfig;
  // Refuse to connect to any other project (for example the retired
  // desiraluxe-web project) even if stale deployment variables point there.
  const expectedIdentity: Pick<FirebasePublicConfig, 'projectId' | 'authDomain' | 'messagingSenderId' | 'appId'> = {
    projectId: previewFallback.projectId,
    authDomain: previewFallback.authDomain,
    messagingSenderId: previewFallback.messagingSenderId,
    appId: previewFallback.appId
  };
  const mismatched = (Object.keys(expectedIdentity) as Array<keyof typeof expectedIdentity>).
  filter((key) => config[key] !== expectedIdentity[key]);
  if (mismatched.length > 0) {
    return {
      config: null,
      source: 'unconfigured',
      error: `Firebase Web app configuration does not match the ${EXPECTED_FIREBASE_PROJECT_ID} project: ${mismatched.join(', ')}.`
    };
  }

  return {
    config,
    source: buildConfig.apiKey ? 'vite-env' : 'preview-fallback',
    error: null
  };
}