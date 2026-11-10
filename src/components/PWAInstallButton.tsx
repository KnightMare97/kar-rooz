import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'settings' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { canInstall, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Requirement: Only display install button when beforeinstallprompt is actually available
  if (!canInstall && !installed) {
    return null;
  }

  const handleClick = async () => {
    setInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted) {
        setInstalled(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (variant === 'settings') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        className={`flex items-center justify-between w-full p-3.5 rounded-xl border border-border/80 bg-surface/50 hover:bg-surface transition-colors text-right ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            {installed ? <Check className="w-5 h-5 text-emerald-400" /> : <Download className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">
              {installed ? 'برنامه نصب شده است' : 'نصب نسخه وب‌اپ (PWA)'}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              دسترسی سریع‌تر، تمام‌صفحه و بدون نوار آدرس مرورگر
            </div>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-md bg-accent text-white font-medium">
          {installing ? 'در حال نصب...' : installed ? 'نصب شد' : 'نصب'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={installing}
      title="نصب برنامه روی دستگاه"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent transition-colors ${className}`}
    >
      {installed ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>نصب شد</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          <span>{installing ? 'در حال نصب...' : 'نصب برنامه'}</span>
        </>
      )}
    </button>
  );
};
