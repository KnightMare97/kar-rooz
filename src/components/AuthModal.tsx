import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  LogOut,
  RefreshCw,
  Database,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    loading,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOut,
    connectionResult,
    isTestingConnection,
    verifyConnection,
    metadata,
  } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#181920] border-t sm:border border-[#2D2F3C] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-gray-600/40 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252733]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 id="auth-modal-title" className="text-sm font-semibold text-gray-100">
              حساب کاربری و وضعیت اتصال به فایربیس
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#232532] rounded-lg transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Auth Error Banner if present */}
          {authError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start justify-between gap-2 text-xs text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-red-400 hover:text-red-200 cursor-pointer text-[11px] underline"
              >
                بستن
              </button>
            </div>
          )}

          {/* User Account Section */}
          <div className="p-4 rounded-xl bg-[#14151C] border border-[#262835] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200">وضعیت احراز هویت</span>
              {user ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>وارد شده (Google)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md font-medium">
                  <span>کاربر مهمان (حالت محلی)</span>
                </span>
              )}
            </div>

            {user ? (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'کاربر'}
                      className="w-10 h-10 rounded-full border border-violet-500/40 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-900/40 border border-violet-600/40 flex items-center justify-center text-violet-200 font-bold text-sm shrink-0">
                      {user.displayName ? user.displayName.charAt(0) : 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-100 truncate">
                      {user.displayName || 'کاربر کار روز'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono truncate dir-ltr text-right">
                      {user.email || 'بدون ایمیل'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-300 hover:text-white bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج از حساب</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 space-y-2.5">
                <p className="text-xs text-gray-400 leading-relaxed">
                  با ورود از طریق حساب گوگل، هویت شما در سیستم فایربیس تأیید شده و می‌توانید اتصال به پایگاه داده ابری را برقرار نمایید.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-xl transition-colors cursor-pointer shadow-sm shadow-violet-900/30 disabled:opacity-50"
                >
                  {/* Google "G" Icon */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                    />
                  </svg>
                  <span>ورود با حساب گوگل (Google Sign-In)</span>
                </button>
              </div>
            )}
          </div>

          {/* Data Safety & Non-Destructive Explainer */}
          <div className="p-3.5 rounded-xl bg-[#14151C] border border-[#252734] space-y-1.5">
            <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold">
              <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
              <span>ایمنی اطلاعات و مدیریت مهاجرت:</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              ورود به حساب گوگل هرگز به صورت خودکار داده‌های محلی شما را آپلود، بازنویسی یا پاک نمی‌کند. با استفاده از قابلیت «مدیریت انتقال داده‌ها» می‌توانید اطلاعات موجود در این دستگاه را با پیش‌نمایش و بررسی عدم تداخل به پایگاه ابری منتقل کنید، یا بدون انتقال به عنوان محیط‌های مستقل ادامه دهید.
            </p>
          </div>

          {/* Firebase Technical Architecture & Verification */}
          <div className="p-4 rounded-xl bg-[#14151C] border border-[#262835] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>مشخصات فنی و اتصال زیرساخت ابری</span>
              </div>
              <button
                type="button"
                onClick={verifyConnection}
                disabled={isTestingConnection}
                className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer disabled:opacity-50"
                title="آزمون ارتباط با سرور فایربیس"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
                <span>آزمون مجدد اتصال</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {/* Project ID */}
              <div className="flex items-center justify-between py-1 border-b border-[#1E202B]">
                <span className="text-gray-400">شناسه پروژه (Project ID):</span>
                <span className="font-mono text-gray-200 dir-ltr text-left selection:bg-violet-600/30">
                  {metadata.projectId}
                </span>
              </div>

              {/* Firestore Database ID */}
              <div className="flex items-center justify-between py-1 border-b border-[#1E202B]">
                <span className="text-gray-400">شناسه دیتابیس (Firestore DB):</span>
                <span className="font-mono text-[11px] text-gray-200 dir-ltr text-left truncate max-w-[200px] selection:bg-violet-600/30" title={metadata.firestoreDatabaseId}>
                  {metadata.firestoreDatabaseId}
                </span>
              </div>

              {/* Security Rules Status */}
              <div className="flex items-center justify-between py-1 border-b border-[#1E202B]">
                <span className="text-gray-400">قوانین امنیتی (Rules):</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Lock className="w-3 h-3" />
                  <span>مستقر شد (Zero-Trust پیش‌فرض منع‌شده)</span>
                </span>
              </div>

              {/* Server Connection Status */}
              <div className="pt-1 space-y-1">
                <span className="text-gray-400 block text-[11px]">وضعیت دسترسی سرور:</span>
                {connectionResult ? (
                  <div
                    className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                      connectionResult.success
                        ? 'bg-emerald-950/25 border-emerald-800/40 text-emerald-300'
                        : 'bg-red-950/25 border-red-800/40 text-red-300'
                    }`}
                  >
                    {connectionResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{connectionResult.message}</p>
                      {connectionResult.details && (
                        <p className="text-[10px] opacity-75 mt-0.5 dir-ltr text-right truncate">
                          {connectionResult.details}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-[#111218] border border-[#232532] text-[11px] text-gray-400">
                    در حال بررسی ارتباط...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#252733] bg-[#14151C]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
