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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

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
      // Don't treat user-closed-popup as a fatal bug, but show gentle message if needed
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('پنجره ورود توسط کاربر بسته شد.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setAuthError('درخواست ورود لغو شد.');
      } else {
        setAuthError(err.message || 'خطا در ورود با گوگل');
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
    }),
    [user, loading, authError, connectionResult, isTestingConnection]
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
