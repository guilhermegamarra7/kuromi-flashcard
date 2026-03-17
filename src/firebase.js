import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBmLjhWNClEIcq699vB0ewKA9Ztusfw-TA",
  authDomain: "kuromi-4b039.firebaseapp.com",
  projectId: "kuromi-4b039",
  storageBucket: "kuromi-4b039.firebasestorage.app",
  messagingSenderId: "148899727000",
  appId: "1:148899727000:web:7469a76306a8a72a2db2ed",
  measurementId: "G-DF4T0SF6TL"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);