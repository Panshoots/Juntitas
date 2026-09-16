import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRldtCPWNQffIp_uzUzNbfR9gaC1sFGNA",
  authDomain: "juntitas-47e8d.firebaseapp.com",
  projectId: "juntitas-47e8d",
  storageBucket: "juntitas-47e8d.firebasestorage.app",
  messagingSenderId: "651954041543",
  appId: "1:651954041543:web:69f9c6592bb01b7d7b84e2",
  measurementId: "G-FZRE6D2XVH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
