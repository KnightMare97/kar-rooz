import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  testConnection,
  onAuthStateChanged,
  FirebaseUser,
  firebaseMetadata,
  ConnectionTestResult,
} from '../services/firebase';

import { SyncStatus } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  connectionResult: ConnectionTestResult | null;
  isTestingConnection: boolean;
  verifyConnection: () => Promise<ConnectionTestResult>;
  metadata: typeof firebaseMetadata;
  syncStatus: SyncStatus;
  setSyncStatus: (s: SyncStatus) => void;
  hasPendingWrites: boolean;
  setHasPendingWrites: (p: boolean) => void;
  syncError: string | null;
  setSyncError: (e: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error('Auth state error:', err);
        setAuthError(err.message);
        setLoading(false);
      }
    );

    // Initial server connection test per critical constraint
    testConnection().then((result) => {
      setConnectionResult(result);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      // Re-test connection upon sign-in
      testConnection().then((res) => setConnectionResult(res));
    } catch (err: any) {
      // Friendly Persian error translation
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('پنجره ورود توسط کاربر بسته شد.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setAuthError('درخواست قبلی ورود لغو شد.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('مرورگر باز شدن پنجره ورود را مسدود کرد. لطفاً به مرورگر اجازه باز کردن پنجره (Pop-up) بدهید.');
      } else if (err?.code === 'auth/network-request-failed') {
        setAuthError('خطای ارتباط با شبکه اینترنت. لطفاً اتصال خود را بررسی کرده و مجدداً تلاش کنید.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('دامنه فعلی در فهرست دامنه‌های مجاز فایربیس ثبت نشده است.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setAuthError('روش ورود با گوگل در تنظیمات فایربیس فعال نیست.');
      } else {
        setAuthError(err?.message || 'خطا در برقراری ارتباط و ورود با گوگل');
      }
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await logoutUser();
    } catch (err: any) {
      setAuthError(err.message || 'خطا در خروج از حساب');
    }
  };

  const verifyConnection = async (): Promise<ConnectionTestResult> => {
    setIsTestingConnection(true);
    try {
      const res = await testConnection();
      setConnectionResult(res);
      return res;
    } finally {
      setIsTestingConnection(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      clearAuthError: () => setAuthError(null),
      signInWithGoogle: handleSignIn,
      signOut: handleSignOut,
      connectionResult,
      isTestingConnection,
      verifyConnection,
      metadata: firebaseMetadata,
      syncStatus,
      setSyncStatus,
      hasPendingWrites,
      setHasPendingWrites,
      syncError,
      setSyncError,
    }),
    [user, loading, authError, connectionResult, isTestingConnection, syncStatus, hasPendingWrites, syncError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
