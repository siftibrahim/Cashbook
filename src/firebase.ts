import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAL5yaMvk5b4qBcPXPVboePWLekmwZkjx0",
  authDomain: "ibrahim-general-store.firebaseapp.com",
  projectId: "ibrahim-general-store",
  storageBucket: "ibrahim-general-store.firebasestorage.app",
  messagingSenderId: "180671626383",
  appId: "1:180671626383:web:19d3a26fc0eaea6a7904fa",
  measurementId: "G-GYJXXD0R9B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with auto-detect long polling and multi-tab persistent cache
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
