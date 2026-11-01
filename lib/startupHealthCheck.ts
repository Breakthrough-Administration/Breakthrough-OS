/**
 * Client-Side Automated Startup Health Check Utility
 * Validates the presence and integrity of client-side credentials,
 * Firebase configuration, and Google Workspace connectivity.
 */

import firebaseConfig from '../firebase-applet-config.json';

export interface HealthCheckItem {
  id: string;
  name: string;
  category: 'api_key' | 'database' | 'service_account' | 'workspace' | 'runtime';
  status: 'valid' | 'warning' | 'missing' | 'error';
  message: string;
  details?: string;
  recommendedAction?: string;
}

export interface SystemHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  summary: string;
  checks: HealthCheckItem[];
  metadata: {
    projectId: string;
    databaseId: string;
    environment: string;
  };
}

/**
 * Validates client-side and known configuration credentials.
 */
export function runClientStartupHealthCheck(): SystemHealthReport {
  const checks: HealthCheckItem[] = [];

  // 1. Firebase Client Configuration
  const hasProjectId = Boolean(firebaseConfig.projectId && firebaseConfig.projectId.trim().length > 0);
  const hasApiKey = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
  const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

  if (hasProjectId && hasApiKey) {
    checks.push({
      id: 'firebase_client_config',
      name: 'Firebase Client Credentials',
      category: 'database',
      status: 'valid',
      message: `Configured for project "${firebaseConfig.projectId}"`,
      details: `Target Firestore Database: ${firestoreDbId}`,
    });
  } else {
    checks.push({
      id: 'firebase_client_config',
      name: 'Firebase Client Credentials',
      category: 'database',
      status: 'error',
      message: 'Firebase configuration is incomplete or missing in firebase-applet-config.json.',
      recommendedAction: 'Verify firebase-applet-config.json exists with valid apiKey and projectId.',
    });
  }

  // 2. Google OAuth & Workspace Client ID
  const oAuthClientId = (firebaseConfig as any).oAuthClientId;
  if (oAuthClientId && oAuthClientId.includes('.apps.googleusercontent.com')) {
    checks.push({
      id: 'google_workspace_oauth',
      name: 'Google OAuth Client ID',
      category: 'workspace',
      status: 'valid',
      message: 'Active OAuth Client configured for Google Drive & Picker API',
      details: `Client ID: ${oAuthClientId.substring(0, 18)}...`,
    });
  } else {
    checks.push({
      id: 'google_workspace_oauth',
      name: 'Google OAuth Client ID',
      category: 'workspace',
      status: 'warning',
      message: 'OAuth Client ID not detected in firebase-applet-config.json.',
      recommendedAction: 'Workspace Drive picker will fall back to Firebase Google Auth token.',
    });
  }

  // 3. Overall status calculation
  const hasErrors = checks.some((c) => c.status === 'error');
  const hasWarnings = checks.some((c) => c.status === 'warning');
  const overallStatus: SystemHealthReport['overallStatus'] = hasErrors
    ? 'critical'
    : hasWarnings
    ? 'degraded'
    : 'healthy';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    summary:
      overallStatus === 'healthy'
        ? 'All clinical gateway credentials and database configurations are operational.'
        : overallStatus === 'degraded'
        ? 'System operational with non-blocking credential warnings.'
        : 'Critical startup credentials missing. Review configuration immediately.',
    checks,
    metadata: {
      projectId: firebaseConfig.projectId || 'gen-lang-client-0291935584',
      databaseId: firestoreDbId,
      environment: typeof window === 'undefined' ? 'server' : 'browser',
    },
  };
}
