import type { User } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { Word } from './types';

// Must match isAdmin() in firestore.rules. The rules are what actually grant
// access to other accounts; this list only decides whether to show the tab.
export const ADMIN_UIDS: string[] = ['ADMIN_UID'];

export function isAdmin(user: User | null): boolean {
  return user !== null && ADMIN_UIDS.includes(user.uid);
}

export interface Account {
  uid: string;
  /** Empty until the account signs in with a version of the app that records it. */
  email: string;
  words: Word[];
  /** When the word list last changed, by its owner or by an admin. */
  updatedAt: Date | null;
}

function toAccount(uid: string, data: Record<string, unknown>): Account {
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    words: Array.isArray(data.words) ? (data.words as Word[]) : [],
    updatedAt: updatedAt?.toDate?.() ?? null,
  };
}

export async function listAccounts(): Promise<Account[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => toAccount(d.id, d.data()));
}

// The revision of this admin's last write, so its echo from the server isn't mistaken for the owner's change.
let lastAdminRevision: string | null = null;

/** Follows one account live, so changes its owner makes meanwhile show up. */
export function watchAccount(uid: string, onChange: (account: Account) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists() || snap.metadata.hasPendingWrites) return;
    const data = snap.data();
    if (data.revision && data.revision === lastAdminRevision) return;
    onChange(toAccount(uid, data));
  });
}

/** Replaces an account's word list. Its owner's open app picks the change up like any other device's. */
export function saveAccountWords(uid: string, words: Word[]): Promise<void> {
  const revision = `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  lastAdminRevision = revision;
  return setDoc(doc(db, 'users', uid), { words, revision, updatedAt: serverTimestamp() }, { merge: true });
}
