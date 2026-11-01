import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { UserRole } from '@/types';

let adminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0]!;
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'gen-lang-client-0291935584';

  // Lazy initialize Firebase Admin
  try {
    let serviceAccount: any = null;
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (rawKey) {
      if (typeof rawKey === 'string' && rawKey.trim().startsWith('{')) {
        try {
          serviceAccount = JSON.parse(rawKey);
        } catch (parseErr) {
          console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON string:', parseErr);
        }
      } else if (typeof rawKey === 'string' && rawKey.includes('PRIVATE KEY')) {
        serviceAccount = {
          project_id: projectId,
          client_email:
            process.env.FIREBASE_CLIENT_EMAIL ||
            'firebase-adminsdk-fbsvc@gen-lang-client-0291935584.iam.gserviceaccount.com',
          private_key: rawKey.replace(/\\n/g, '\n')
        };
      }
    }

    if (!serviceAccount) {
      const candidatePaths = [
        path.join(process.cwd(), 'service-account.json'),
        path.join(process.cwd(), 'gen-lang-client-0291935584-firebase-adminsdk-fbsvc-9e23b0dcb2.json'),
        '/app/applet/service-account.json',
        '/app/applet/gen-lang-client-0291935584-firebase-adminsdk-fbsvc-9e23b0dcb2.json'
      ];
      for (const saPath of candidatePaths) {
        if (fs.existsSync(saPath)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            if (serviceAccount) {
              if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(serviceAccount);
              }
              break;
            }
          } catch (fileErr) {
            console.warn(`Could not parse service account file at ${saPath}:`, fileErr);
          }
        }
      }
    }

    if (!serviceAccount && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      serviceAccount = {
        project_id: projectId,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(serviceAccount);
      }
    }

    if (serviceAccount) {
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    } else {
      adminApp = initializeApp({
        projectId
      });
    }
  } catch (err: any) {
    console.warn('Firebase Admin default initialization notice:', err?.message);
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0]!;
    } else {
      adminApp = initializeApp({ projectId }, 'BreakthroughAdminFallback');
    }
  }

  return adminApp;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

/**
 * Extracts and verifies the Firebase ID Token from request Authorization header or cookies.
 * Resolves user role from Firestore /users/{uid} or custom claims.
 */
export async function verifyAuthToken(
  req: NextRequest | Request
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Check cookie fallback if no header
  if (!token && 'cookies' in req && typeof (req as any).cookies?.get === 'function') {
    token = (req as any).cookies.get('token')?.value || (req as any).cookies.get('session')?.value || null;
  }

  if (!token) {
    return null;
  }

  // Handle mock / test environment tokens in test / offline runner
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_TEST_HARNESS === 'true') {
    if (token.startsWith('test-token-') || token.startsWith('token-')) {
      const roleMatch = token.includes('admin') ? 'ADMIN'
        : token.includes('practitioner') ? 'PRACTITIONER'
        : token.includes('viewer') ? 'VIEWER'
        : token.includes('coordinator') ? 'SUPPORT_COORDINATOR'
        : token.includes('participant') ? 'PARTICIPANT'
        : 'PRACTITIONER';

      return {
        uid: `test-${token.slice(0, 16)}`,
        email: `${roleMatch.toLowerCase()}@breakthrough.org.au`,
        role: roleMatch as UserRole,
        displayName: `Test ${roleMatch}`
      };
    }
  }

  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Automatically grant ADMIN role to the verified platform admin / project owner
    const isBootstrappedAdmin =
      email.toLowerCase() === 'shivandharipersad@gmail.com' ||
      decodedToken.role === 'ADMIN' ||
      decodedToken.role === 'admin';

    // Fetch verified role from Firestore /users/{uid}
    let role: UserRole = isBootstrappedAdmin ? 'ADMIN' : ((decodedToken.role as UserRole) || 'PENDING');

    if (!isBootstrappedAdmin) {
      try {
        const databaseId =
          process.env.FIRESTORE_DATABASE_ID ||
          process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
        const firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.role) {
            role = data.role as UserRole;
          }
        }
      } catch (firestoreErr) {
        console.warn('Could not read user role from Firestore admin SDK:', firestoreErr);
        if (decodedToken.role) {
          role = decodedToken.role as UserRole;
        }
      }
    }

    return {
      uid,
      email,
      role,
      displayName: decodedToken.name || decodedToken.displayName
    };
  } catch (error: any) {
    console.error('Failed to verify ID token in verifyAuthToken:', error?.message);
    return null;
  }
}

/**
 * Validates session and checks role requirements.
 * Returns either the AuthenticatedUser or a structured NextResponse error.
 */
export async function requireAuth(
  req: NextRequest | Request,
  allowedRoles?: UserRole[]
): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const user = await verifyAuthToken(req);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'UNAUTHENTICATED',
          message: 'Valid Firebase Bearer ID Token is required to access this endpoint'
        },
        { status: 401 }
      )
    };
  }

  if (user.role === 'PENDING') {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'FORBIDDEN_PENDING_APPROVAL',
          message: 'Your account is pending administrator approval before API access is granted.'
        },
        { status: 403 }
      )
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Requires one of [${allowedRoles.join(', ')}], current role is ${user.role}`
        },
        { status: 403 }
      )
    };
  }

  return { user };
}
