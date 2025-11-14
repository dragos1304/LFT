import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../services/firebaseConfig";

// FIX: The side-effect imports below are for the Firebase v8 compat API and conflict
// with the v9 modular SDK. They have been removed as they were causing module resolution errors.

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);

export { app, db };