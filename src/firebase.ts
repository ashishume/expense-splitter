import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTNI0AHWWh5Q6Vx-mkdSMb7K2Ua7VDNpA",
  authDomain: "cycle-demo-client.firebaseapp.com",
  projectId: "cycle-demo-client",
  storageBucket: "cycle-demo-client.firebasestorage.app",
  messagingSenderId: "641959779564",
  appId: "1:641959779564:web:2546dba74b39eedf4099c9",
  measurementId: "G-B50G4LYHSH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
