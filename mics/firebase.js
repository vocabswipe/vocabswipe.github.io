// firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA8I1ryMTTXliXcwY-F-AC-Bd4Df7ZWuvY",
  authDomain: "demosubscriptionapp.firebaseapp.com",
  projectId: "demosubscriptionapp",
  storageBucket: "demosubscriptionapp.firebasestorage.app",
  messagingSenderId: "1034801175243",
  appId: "1:1034801175243:web:8806bc21eb6f836ea4d94e",
  measurementId: "G-YSVG42JN42"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
