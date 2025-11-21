import admin from "firebase-admin";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account credentials from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // For local development, initialize with project ID only
      // This will work if you're authenticated with Firebase CLI
      admin.initializeApp({
        projectId:
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "easyplay-2658a",
      });
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    // Fallback initialization
    admin.initializeApp({
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "easyplay-2658a",
    });
  }
}

export const adminDb = admin.firestore();
export default admin;
