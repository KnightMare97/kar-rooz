import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, X, ShieldCheck, Sparkles } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Top spacing & PWA Install option if available */}
      <div className="w-full max-w-sm flex justify-end">
        <PWAInstallButton />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-surface/70 backdrop-blur-md border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center my-auto">
        {/* App Logo */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/30 flex items-center justify-center shadow-lg shadow-accent/10">
            <svg
              className="w-11 h-11 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-accent/40 flex items-center justify-center text-accent">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Brand Titles */}
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">
          کار روز | KarRooz
        </h1>
        <p className="text-sm text-text-muted leading-relaxed mb-8">
          مدیریت آرام کارها، ثبت سریع یادداشت‌ها و تمرکز روزانه
        </p>

        {/* Auth Error Banner */}
        {authError && (
          <div className="w-full mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-right flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{authError}</div>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-rose-400 hover:text-rose-200 transition-colors p-0.5"
              aria-label="بستن پیام خطا"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              <span>در حال برقراری ارتباط با گوگل...</span>
            </div>
          ) : (
            <>
              {/* Google colored G logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>ورود با حساب گوگل</span>
            </>
          )}
        </button>

        {/* Privacy & Safe Storage assurance */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>همگام‌سازی ابری امن و حفظ اطلاعات ذخیره‌شده</span>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs text-text-muted/60 py-4 max-w-sm">
        برای دسترسی به کارها، همگام‌سازی و اتصال به بات تلگرام، ورود به حساب کاربری لازم است.
      </footer>
    </div>
  );
};
