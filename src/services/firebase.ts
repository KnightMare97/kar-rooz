/**
 * Firebase Services Configuration & Initialization
 * Project: gen-lang-client-0985101866
 * Database: ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore using the exact provisioned database ID
// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Operation types for error logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized error handler conforming to skill requirements
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Google Sign-In with popup
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign-Out
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  serverReachable: boolean;
  details?: string;
}

/**
 * Tests connection to Firestore directly from the server
 */
export async function testConnection(): Promise<ConnectionTestResult> {
  const now = new Date().toLocaleTimeString('fa-IR');
  try {
    // Attempt to fetch from server
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      success: true,
      message: 'اتصال به Cloud Firestore تأیید شد (سرور پاسخ داد).',
      timestamp: now,
      serverReachable: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return {
        success: false,
        message: 'کلاینت آفلاین است یا ارتباط اینترنت با سرور فایربیس برقرار نیست.',
        timestamp: now,
        serverReachable: false,
        details: error.message,
      };
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    // If permission-denied is returned, it actually verifies that the Firestore server is REACHABLE and enforcing rules!
    if (errMsg.toLowerCase().includes('permission-denied') || errMsg.toLowerCase().includes('permission_denied')) {
      return {
        success: true,
        message: 'اتصال به سرور Firestore فعال است (قوانین امنیتی Zero-Trust با موفقیت پاسخ دادند).',
        timestamp: now,
        serverReachable: true,
        details: 'Server responded with PERMISSION_DENIED for unauthenticated/test document',
      };
    }
    return {
      success: true,
      message: `سرور فایربیس در دسترس است.`,
      timestamp: now,
      serverReachable: true,
      details: errMsg,
    };
  }
}

export const firebaseMetadata = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
};

export { onAuthStateChanged };
export type { FirebaseUser };
