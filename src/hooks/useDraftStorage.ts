import { useState, useEffect, useRef, useCallback } from 'react';
import { Item } from '../types';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'cached_offline' | 'error';

interface UseDraftStorageOptions {
  userId: string | null;
  noteId: string | 'new';
  initialText: string;
  onCommitSave: (text: string) => Promise<boolean>;
  debounceMs?: number;
}

export function useDraftStorage({
  userId,
  noteId,
  initialText,
  onCommitSave,
  debounceMs = 700,
}: UseDraftStorageOptions) {
  const cacheKey = `karrooz_draft_cache_${userId || 'guest'}_${noteId}`;

  // Check if there is an uncommitted local cache (e.g. from refresh or crash)
  const [text, setText] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached !== null && cached.trim().length > 0 && cached !== initialText) {
          return cached;
        }
      } catch {
        // ignore storage error
      }
    }
    return initialText;
  });

  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const debounceTimerRef = useRef<number | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const lastSavedTextRef = useRef<string>(initialText);

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // If there was a pending text saved locally while offline, flush it now
      if (pendingTextRef.current !== null && pendingTextRef.current !== lastSavedTextRef.current) {
        flushCommit(pendingTextRef.current);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (isSavingRef.current || pendingTextRef.current !== null) {
        setStatus('cached_offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushCommit = useCallback(
    async (textToSave: string) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // If empty string and it was already empty, nothing to do
      if (!textToSave.trim() && !lastSavedTextRef.current.trim()) {
        setStatus('idle');
        return;
      }

      if (!navigator.onLine) {
        setStatus('cached_offline');
        // Persist to local cache so nothing is lost
        try {
          localStorage.setItem(cacheKey, textToSave);
        } catch {}
        return;
      }

      setStatus('saving');
      isSavingRef.current = true;

      try {
        const ok = await onCommitSave(textToSave);
        if (ok) {
          lastSavedTextRef.current = textToSave;
          setStatus('saved');
          // Once synced to persistent storage, remove temporary typing cache
          try {
            localStorage.removeItem(cacheKey);
          } catch {}
        } else {
          setStatus('cached_offline');
        }
      } catch (err) {
        console.error('Draft auto-save error:', err);
        setStatus('error');
      } finally {
        isSavingRef.current = false;
      }
    },
    [cacheKey, onCommitSave]
  );

  const updateText = useCallback(
    (newText: string) => {
      setText(newText);
      pendingTextRef.current = newText;

      // Always write immediately to local device cache for persistence
      try {
        if (newText.trim().length > 0) {
          localStorage.setItem(cacheKey, newText);
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch {}

      if (!navigator.onLine) {
        setStatus('cached_offline');
        return;
      }

      setStatus('saving');

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        flushCommit(newText);
      }, debounceMs);
    },
    [cacheKey, debounceMs, flushCommit]
  );

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
    } catch {}
  }, [cacheKey]);

  // Cleanup on unmount: if pending text exists, flush it
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    text,
    setText: updateText,
    status,
    isOnline,
    flushCommit: () => flushCommit(text),
    clearCache,
  };
}
