import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Local-only testing hook: visiting the app as http://localhost:5173/?emulator=1
// points the SDK at the Firebase Local Emulator Suite instead of the real
// project, so sign-in and sync can be exercised end-to-end without touching
// production data. Never triggers outside of localhost.
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('emulator') === '1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
