// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAXOJyk0n3kfKHAxjwwFdnxgpLEJdBgL1U",
  authDomain: "easyplay-2658a.firebaseapp.com",
  projectId: "easyplay-2658a",
  storageBucket: "easyplay-2658a.firebasestorage.app",
  messagingSenderId: "1013014323852",
  appId: "1:1013014323852:web:06b93fbd5d24883f6d91a9",
  measurementId: "G-6SLNEC8BGE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only on client side
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics };
