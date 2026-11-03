import { App, getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';
import fs from 'fs';
import path from 'path';

let serviceAccount: any = null;

function parseSecretOrJson(raw: string): any {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

try {
  const envSecret =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (envSecret) {
    serviceAccount = parseSecretOrJson(envSecret);
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
  } else {
    const candidatePaths = [
      path.resolve(process.cwd(), 'service-account.json'),
      path.resolve(
        process.cwd(),
        'public/assets/aistudio/gen-lang-client-0846355299-firebase-adminsdk-fbsvc-8f4872be18_8eb81664.json'
      ),
      path.resolve(
        process.cwd(),
        'public/assets/aistudio/gen-lang-client-0846355299-firebase-adminsdk-fbsvc-0aad08523d_4d4314e5.json'
      ),
    ];
    for (const saPath of candidatePaths) {
      if (fs.existsSync(saPath)) {
        const raw = fs.readFileSync(saPath, 'utf8');
        serviceAccount = JSON.parse(raw);
        break;
      }
    }
  }
} catch (err) {
  console.warn('Could not load service account credentials:', err);
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
      credential: cert({
        projectId: serviceAccount.project_id || projectId,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
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
