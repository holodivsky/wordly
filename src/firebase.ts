import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Local-only testing hook: visiting the app as http://localhost:5173/?emulator=1
// points the SDK at the Firebase Local Emulator Suite instead of the real
// project, so the email-link sign-in flow can be exercised end-to-end
// without sending real email. Never triggers outside of localhost.
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('emulator') === '1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

const EMAIL_FOR_SIGN_IN_KEY = 'gvt.emailForSignIn.v1';

/** Sends a passwordless sign-in link to the given email. */
export async function sendSignInLink(email: string): Promise<void> {
  const url = new URL(location.href);
  url.hash = '';
  await sendSignInLinkToEmail(auth, email, {
    url: url.toString(),
    handleCodeInApp: true,
  });
  localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

export function isEmailSignInLink(): boolean {
  return isSignInWithEmailLink(auth, location.href);
}

/**
 * Completes sign-in if the current URL is an email sign-in link. If the link
 * was opened on a different device than the one that requested it, we won't
 * have the email stashed locally, so the caller must supply one (e.g. via a
 * prompt) through `promptForEmail`.
 */
export async function completeEmailSignIn(promptForEmail: () => string | null): Promise<'ok' | 'no-email' | 'not-a-link'> {
  if (!isEmailSignInLink()) return 'not-a-link';
  let email = localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!email) {
    email = promptForEmail();
    if (!email) return 'no-email';
  }
  await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  // Strip the sign-in-link query params so a refresh doesn't try to replay it.
  const cleanUrl = new URL(location.href);
  cleanUrl.search = '';
  history.replaceState(null, '', cleanUrl.toString());
  return 'ok';
}

/**
 * Starts Google sign-in via a full-page redirect (not a popup — a popup
 * backgrounds the main tab, which can trip up Firebase Auth's IndexedDB
 * session persistence with a "Database is closing" error on some browsers).
 * Navigates away; the result is picked up by `completeGoogleRedirectIfPending`
 * once Google redirects back.
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, new GoogleAuthProvider());
}

/** Call on boot to process a pending Google-redirect sign-in, if any. */
export async function completeGoogleRedirectIfPending(): Promise<void> {
  await getRedirectResult(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}
