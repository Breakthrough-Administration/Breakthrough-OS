import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Global error handler to suppress the known Firebase Auth 11.x assertion error
// "INTERNAL ASSERTION FAILED: Pending promise was never set" which can fire
// in iframe or cross-origin popup environments when message events are processed.
if (typeof window !== 'undefined') {
  const isAssertionError = (err: any) => {
    const msg = err?.message || String(err || '');
    return msg.includes('Pending promise was never set');
  };

  window.addEventListener('error', (event) => {
    if (isAssertionError(event.error) || isAssertionError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isAssertionError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Test Firestore connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Offline cache mode or initial cold boot
      console.warn('Firestore client initialized.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export { app, auth, db, testConnection };

export function onAuthUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedGoogleAccessToken = null;
    }
    callback(user);
  });
}

export async function logOutGoogle(): Promise<void> {
  try {
    cachedGoogleAccessToken = null;
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

let cachedGoogleAccessToken: string | null = null;

export function getCachedGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function setCachedGoogleAccessToken(token: string | null): void {
  cachedGoogleAccessToken = token;
}

let activeSignInPromise: Promise<{
  user: User;
  credential: any;
  accessToken: string | null;
}> | null = null;

export async function signInWithGoogle(customScopes?: string[]): Promise<{
  user: User;
  credential: any;
  accessToken: string | null;
}> {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      const provider = new GoogleAuthProvider();
      const defaultScopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly'
      ];
      const scopes = customScopes && customScopes.length > 0 ? customScopes : defaultScopes;
      scopes.forEach((scope) => provider.addScope(scope));
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
      }
      return { user: result.user, credential, accessToken: credential?.accessToken || null };
    } catch (error: any) {
      // Avoid rethrowing if already handled or popup cancelled
      if (error?.message?.includes('Pending promise was never set')) {
        console.warn('Recovered from Firebase Auth popup assertion.');
      }
      throw error;
    } finally {
      setTimeout(() => {
        activeSignInPromise = null;
      }, 400);
    }
  })();

  return activeSignInPromise;
}
