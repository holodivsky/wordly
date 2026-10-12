import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// The Anthropic key is shared by the accounts allowed in firestore.rules: one
// of them saves it once, and it is fetched after sign-in everywhere else. It
// is never part of the site's code and is not kept in localStorage.
let cachedKey: string | null = null;

function keyRef() {
  return doc(db, 'config', 'anthropic');
}

export function getApiKey(): string | null {
  return cachedKey;
}

export async function loadApiKey(): Promise<void> {
  const snap = await getDoc(keyRef());
  cachedKey = snap.exists() ? ((snap.data().apiKey as string | undefined) ?? null) : null;
}

export async function setApiKey(key: string | null): Promise<void> {
  if (key) await setDoc(keyRef(), { apiKey: key });
  else await deleteDoc(keyRef());
  cachedKey = key;
}

export function forgetApiKey(): void {
  cachedKey = null;
}
