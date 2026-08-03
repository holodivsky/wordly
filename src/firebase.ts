import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

let signedInPromise: Promise<void> | null = null;

export function ensureSignedIn(): Promise<void> {
  if (signedInPromise) return signedInPromise;
  signedInPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve();
          return;
        }
        signInAnonymously(auth)
          .then(() => resolve())
          .catch(reject);
      },
      reject
    );
  });
  return signedInPromise;
}
