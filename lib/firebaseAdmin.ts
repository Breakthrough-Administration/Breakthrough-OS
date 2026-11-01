import { App, getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';
import fs from 'fs';
import path from 'path';

let serviceAccount: any = null;

try {
  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    const raw = fs.readFileSync(saPath, 'utf8');
    serviceAccount = JSON.parse(raw);
  }
} catch (err) {
  console.warn('Could not load service-account.json:', err);
}

const projectId =
  serviceAccount?.project_id ||
  process.env.FIREBASE_PROJECT_ID ||
  firebaseConfig.projectId;

const databaseId = (firebaseConfig as any).firestoreDatabaseId;

let adminApp: App;

if (getApps().length > 0) {
  adminApp = getApp();
} else if (
  serviceAccount &&
  serviceAccount.private_key &&
  typeof serviceAccount.private_key === 'string' &&
  serviceAccount.private_key.includes('PRIVATE KEY')
) {
  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } catch {
    adminApp = initializeApp({
      projectId,
    });
  }
} else {
  adminApp = initializeApp({
    projectId,
  });
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = databaseId ? getFirestore(adminApp, databaseId) : getFirestore(adminApp);
export default adminApp;
