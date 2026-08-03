import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db, onAuthChange, getCurrentUser, completeEmailSignIn, signOutUser } from './firebase';
import { loadLists, saveLists, setSyncPushHandler } from './storage';
import type { WordList } from './types';

export { sendSignInLink } from './firebase';

const PUSH_DEBOUNCE_MS = 600;

function docRefFor(uid: string) {
  return doc(db, 'users', uid);
}

function generateRevision(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Resolves once the tab is visible again. Right after a Google sign-in popup
 * closes, the opener tab can briefly still report `document.hidden`, and
 * Firestore's own persistence layer refuses operations while hidden (throwing
 * "Database is closing/hidden") — so we wait it out before touching Firestore.
 */
function waitForVisible(timeoutMs = 3000): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    }, timeoutMs);
    function onChange() {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', onChange);
        clearTimeout(timer);
        resolve();
      }
    }
    document.addEventListener('visibilitychange', onChange);
  });
}

/** Retries a flaky Firestore call a couple of times with a short delay — covers the same visibility race if it slips past `waitForVisible`. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

let unsubscribe: Unsubscribe | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let currentUid: string | null = null;
// The revision of the last write this device made. Lets us recognize the
// server echoing our own write back (via onSnapshot) and ignore it, instead
// of treating it as an incoming remote change and re-rendering the whole
// app — which would otherwise blow away things like an in-progress quiz round.
let lastPushedRevision: string | null = null;

function schedulePush(lists: WordList[]): void {
  const uid = currentUid;
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const revision = generateRevision();
    lastPushedRevision = revision;
    withRetry(() => setDoc(docRefFor(uid), { lists, revision, updatedAt: serverTimestamp() })).catch(() => {
      // Best-effort background sync — if it still fails after retries, the
      // next local edit's push will carry this same data forward anyway.
    });
  }, PUSH_DEBOUNCE_MS);
}

function stopListening(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function startListening(uid: string, onRemoteChange: () => void): void {
  stopListening();
  unsubscribe = onSnapshot(docRefFor(uid), (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return; // echo of our own not-yet-acked write
    const data = snap.data();
    const revision = data?.revision as string | undefined;
    if (revision && revision === lastPushedRevision) return; // server confirming our own write
    const remoteLists = (data?.lists ?? []) as WordList[];
    saveLists(remoteLists, false);
    onRemoteChange();
  });
}

/** Connects this device to the signed-in user's cloud data and starts live sync. */
async function connectAccountSync(uid: string, onRemoteChange: () => void): Promise<void> {
  await waitForVisible();
  currentUid = uid;
  const snap = await withRetry(() => getDoc(docRefFor(uid)));
  if (snap.exists()) {
    const data = snap.data();
    lastPushedRevision = (data?.revision as string | undefined) ?? null;
    const remoteLists = (data?.lists ?? []) as WordList[];
    saveLists(remoteLists, false);
  } else {
    // First time this account has signed in anywhere: seed the cloud with
    // whatever is on this device right now.
    const revision = generateRevision();
    lastPushedRevision = revision;
    await withRetry(() => setDoc(docRefFor(uid), { lists: loadLists(), revision, updatedAt: serverTimestamp() }));
  }
  setSyncPushHandler(schedulePush);
  startListening(uid, onRemoteChange);
}

function disconnectAccountSync(): void {
  stopListening();
  setSyncPushHandler(null);
  currentUid = null;
  lastPushedRevision = null;
}

export interface AuthStatus {
  email: string | null;
}

/**
 * Sets up auth-state handling for the whole app lifetime: as the signed-in
 * state changes (including right after completing an email sign-in link),
 * connects or disconnects cloud sync and reports the current status. Call
 * once on boot.
 */
export function initAccountSync(onStatusChange: (status: AuthStatus) => void): void {
  onAuthChange(async (user) => {
    if (user) {
      await connectAccountSync(user.uid, () => onStatusChange({ email: user.email }));
      onStatusChange({ email: user.email });
    } else {
      disconnectAccountSync();
      onStatusChange({ email: null });
    }
  });
}

/** Completes sign-in if the current URL is an email sign-in link. */
export function completeSignInFromLink(promptForEmail: () => string | null) {
  return completeEmailSignIn(promptForEmail);
}

export function currentUserEmail(): string | null {
  return getCurrentUser()?.email ?? null;
}

export async function signOutOfAccount(): Promise<void> {
  await signOutUser();
}
