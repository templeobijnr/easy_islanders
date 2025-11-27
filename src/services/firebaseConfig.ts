
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: "easy-islanders.firebaseapp.com",
  projectId: "easy-islanders",
  storageBucket: "easy-islanders.firebasestorage.app",
  messagingSenderId: "618304320776",
  appId: "1:618304320776:web:5f602d332d4b28d07628bd",
  measurementId: "G-GLVWS1QT7E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
// explicitly connecting to the named database 'easy-db'
const db = getFirestore(app, "easy-db");

// Initialize Firebase Authentication
// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Firebase Storage
import { getStorage } from "firebase/storage";
const storage = getStorage(app);

let analytics = null;

// Safely initialize analytics only if supported in the current environment
// This prevents "Component analytics has not been registered yet" errors
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn("Firebase Analytics is not supported in this environment:", err);
  });
}

export { app, analytics, db, auth, storage };
