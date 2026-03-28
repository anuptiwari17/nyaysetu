import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin env vars are not configured");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseIdToken(token) {
  if (!token) {
    throw new Error("Firebase token is required");
  }

  const app = getFirebaseAdminApp();
  return getAuth(app).verifyIdToken(token);
}
