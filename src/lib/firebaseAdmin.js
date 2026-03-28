import admin from "firebase-admin";

function readPrivateKey() {
  return String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function assertFirebaseAdminEnv() {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = readPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    const missingVars = [];
    if (!projectId) missingVars.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");
    throw new Error(
      `Firebase admin credentials missing: ${missingVars.join(", ")}. ` +
      "Ensure these environment variables are set in your deployment platform."
    );
  }

  return { projectId, clientEmail, privateKey };
}

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credentials = assertFirebaseAdminEnv();

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  });
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  return app.auth();
}
