import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';
import { loadLists, saveLists, setSyncPushHandler } from './storage';
import { generateSyncCode, getSyncCode, normalizeSyncCode, setSyncCode } from './syncCode';
import type { WordList } from './types';

export { getSyncCode } from './syncCode';

const PUSH_DEBOUNCE_MS = 600;

function docRefFor(code: string) {
  return doc(db, 'syncGroups', code);
}

let unsubscribe: Unsubscribe | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush(lists: WordList[]): void {
  const code = getSyncCode();
  if (!code) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    ensureSignedIn().then(() => setDoc(docRefFor(code), { lists, updatedAt: serverTimestamp() }));
  }, PUSH_DEBOUNCE_MS);
}

function stopListening(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function startListening(code: string, onRemoteChange: () => void): void {
  stopListening();
  unsubscribe = onSnapshot(docRefFor(code), (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return; // this is an echo of our own not-yet-acked write
    const data = snap.data();
    const remoteLists = (data?.lists ?? []) as WordList[];
    saveLists(remoteLists, false);
    onRemoteChange();
  });
}

/** Creates a brand-new sync group from the current local lists and starts syncing. Returns the code to share. */
export async function enableSync(onRemoteChange: () => void): Promise<string> {
  await ensureSignedIn();
  const code = generateSyncCode();
  await setDoc(docRefFor(code), { lists: loadLists(), updatedAt: serverTimestamp() });
  setSyncCode(code);
  setSyncPushHandler(schedulePush);
  startListening(code, onRemoteChange);
  return code;
}

/** Joins an existing sync group by code. Replaces local lists with whatever is already in that group. */
export async function joinSync(rawCode: string, onRemoteChange: () => void): Promise<'ok' | 'not-found'> {
  const code = normalizeSyncCode(rawCode);
  await ensureSignedIn();
  const snap = await getDoc(docRefFor(code));
  if (!snap.exists()) return 'not-found';
  const data = snap.data();
  const remoteLists = (data?.lists ?? []) as WordList[];
  saveLists(remoteLists, false);
  setSyncCode(code);
  setSyncPushHandler(schedulePush);
  startListening(code, onRemoteChange);
  return 'ok';
}

export function disableSync(): void {
  stopListening();
  setSyncPushHandler(null);
  setSyncCode(null);
}

/** Call once on app boot: reconnects the live listener if sync was already enabled in a previous session. */
export function resumeSyncIfEnabled(onRemoteChange: () => void): void {
  const code = getSyncCode();
  if (!code) return;
  ensureSignedIn().then(() => {
    setSyncPushHandler(schedulePush);
    startListening(code, onRemoteChange);
  });
}
