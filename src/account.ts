import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  clearLocalData,
  getOwnerUid,
  loadAllWords,
  mergeWords,
  replaceAllWords,
  setOwnerUid,
  setSyncPushHandler,
} from './storage';
import { starterWords } from './starterWords';
import type { Word, WordList } from './types';

// Accounts are created by hand in the Firebase console and allow-listed in
// firestore.rules; there is no sign-up in the app.
const PUSH_DEBOUNCE_MS = 600;

/** The part of the account's email before the "@", for showing who is signed in. */
export function displayLogin(user: User): string {
  return (user.email ?? '').split('@')[0];
}

export function watchAuth(onChange: (user: User | null) => void): void {
  onAuthStateChanged(auth, onChange);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

function generateRevision(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

let unsubscribe: Unsubscribe | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPush: (() => Promise<void>) | null = null;
// The revision of the last write this device made. Lets us recognize the
// server echoing our own write back (via onSnapshot) and ignore it, instead
// of treating it as an incoming remote change and re-rendering the whole
// app — which used to blow away things like an in-progress quiz round.
let lastPushedRevision: string | null = null;

function pushWords(uid: string, words: Word[]): Promise<void> {
  const revision = generateRevision();
  lastPushedRevision = revision;
  // Merged so the email field written at sign-in (shown in the admin tab) survives.
  return setDoc(doc(db, 'users', uid), { words, revision, updatedAt: serverTimestamp() }, { merge: true });
}

async function flushPush(): Promise<void> {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  const push = pendingPush;
  pendingPush = null;
  if (push) await push();
}

/**
 * Brings the signed-in account's words onto this device and keeps the two in
 * step from then on. An account with no word list in the cloud yet (a new one)
 * starts with the starter words. On an account's first sign-in here, words
 * added on this device before anyone signed in are merged into the account,
 * and another account's cached words are dropped. After that the device's cache is used
 * right away (so the app also opens offline) and the cloud copy replaces it
 * as soon as it arrives.
 */
export async function startAccountSync(user: User, onRemoteChange: () => void): Promise<void> {
  stopAccountSync();
  const owner = getOwnerUid();
  if (owner !== user.uid) {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const remoteWords = snap.exists() ? ((snap.data().words ?? []) as Word[]) : null;
    const words = mergeWords(remoteWords ?? starterWords(), owner ? [] : loadAllWords());
    if (!remoteWords || words.length !== remoteWords.length) {
      await pushWords(user.uid, words);
    } else {
      lastPushedRevision = (snap.data()?.revision as string | undefined) ?? null;
    }
    if (owner) clearLocalData();
    replaceAllWords(words);
    setOwnerUid(user.uid);
  }

  // Lets the admin tab show whose list this is; a failure here only costs that label.
  setDoc(doc(db, 'users', user.uid), { email: user.email ?? '' }, { merge: true }).catch(() => {});

  setSyncPushHandler((lists: WordList[]) => {
    pendingPush = () => pushWords(user.uid, lists[0]?.words ?? []);
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, PUSH_DEBOUNCE_MS);
  });

  unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
    if (!docSnap.exists()) return;
    if (docSnap.metadata.hasPendingWrites) return; // this is an echo of our own not-yet-acked write
    const data = docSnap.data();
    if (data.revision && data.revision === lastPushedRevision) return; // server confirming our own write — nothing changed for us
    replaceAllWords((data.words ?? []) as Word[]);
    onRemoteChange();
  });
}

function stopAccountSync(): void {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  setSyncPushHandler(null);
  lastPushedRevision = null;
}

/** Signs out. With `clearDevice`, also removes the account's words from this device, so the next person to sign in here doesn't see them. */
export async function signOutAccount(clearDevice: boolean): Promise<void> {
  await flushPush().catch(() => {});
  stopAccountSync();
  if (clearDevice) clearLocalData();
  await signOut(auth);
}
