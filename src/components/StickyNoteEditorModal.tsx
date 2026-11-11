import React, { useState, useEffect, useRef } from 'react';
import { Item, Project, StickyColor } from '../types';
import { useDraftStorage } from '../hooks/useDraftStorage';
import { STICKY_COLOR_THEMES, STICKY_COLOR_LIST } from '../utils/stickyColors';
import {
  X,
  Pin,
  Check,
  CheckCircle2,
  RefreshCw,
  CloudOff,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ListTodo,
  Folder,
} from 'lucide-react';
import { OrganizeNoteModal } from './OrganizeNoteModal';

interface StickyNoteEditorModalProps {
  isOpen: boolean;
  note: Item | null; // null means creating a new note
  userId: string | null;
  projects: Project[];
  onClose: () => void;
  onSaveNote: (item: Item) => Promise<boolean>;
  onConvertToTask: (note: Item) => void;
  onDeleteNote?: (noteId: string) => void;
}

export const StickyNoteEditorModal: React.FC<StickyNoteEditorModalProps> = ({
  isOpen,
  note,
  userId,
  projects,
  onClose,
  onSaveNote,
  onConvertToTask,
  onDeleteNote,
}) => {
  const [currentColor, setCurrentColor] = useState<StickyColor>(
    note?.color || 'default'
  );
  const [isPinned, setIsPinned] = useState<boolean>(note?.pinned || false);
  const [isDraft, setIsDraft] = useState<boolean>(
    note ? (note.isDraft ?? false) : true
  );
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Item | null>(note);

  // Sync internal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentColor(note?.color || 'default');
      setIsPinned(note?.pinned || false);
      setIsDraft(note ? (note.isDraft ?? false) : true);
      setCurrentNote(note);
    }
  }, [isOpen, note]);

  // Keep a ref to the active note for async commit
  const activeNoteRef = useRef<Item | null>(note);
  useEffect(() => {
    activeNoteRef.current = currentNote;
  }, [currentNote]);

  const initialContent = note ? note.description || note.title || '' : '';

  const handleCommitSave = async (content: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed) {
      return true; // Nothing to commit if empty
    }

    const firstLineTitle = trimmed.split('\n')[0].slice(0, 100);

    let itemToSave: Item;
    if (activeNoteRef.current) {
      itemToSave = {
        ...activeNoteRef.current,
        title: activeNoteRef.current.title && activeNoteRef.current.title !== initialContent.split('\n')[0].slice(0, 100)
          ? activeNoteRef.current.title
          : firstLineTitle,
        description: content,
        color: currentColor,
        pinned: isPinned,
        isDraft,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Create new draft note item with stable ID
      const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      itemToSave = {
        id: newId,
        type: 'note',
        title: firstLineTitle,
        description: content,
        completed: false,
        tags: [],
        color: currentColor,
        pinned: isPinned,
        isDraft: true, // Auto-saved as draft initially
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const success = await onSaveNote(itemToSave);
    if (success) {
      setCurrentNote(itemToSave);
      activeNoteRef.current = itemToSave;
    }
    return success;
  };

  const {
    text,
    setText,
    status,
    flushCommit,
    clearCache,
  } = useDraftStorage({
    userId,
    noteId: note?.id || 'new',
    initialText: initialContent,
    onCommitSave: handleCommitSave,
    debounceMs: 700,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const colorTheme = STICKY_COLOR_THEMES[currentColor] || STICKY_COLOR_THEMES.default;

  const handleClose = async () => {
    // If text has content, ensure it is committed before closing
    if (text.trim().length > 0) {
      await flushCommit();
    } else {
      // Empty note opened and closed: do NOT create an empty draft
      clearCache();
    }
    onClose();
  };

  const handleTogglePin = async () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    if (currentNote && text.trim().length > 0) {
      const updated: Item = {
        ...currentNote,
        pinned: nextPinned,
        description: text,
        updatedAt: new Date().toISOString(),
      };
      await onSaveNote(updated);
      setCurrentNote(updated);
    }
  };

  const handleSelectColor = async (c: StickyColor) => {
    setCurrentColor(c);
    if (currentNote && text.trim().length > 0) {
      const updated: Item = {
        ...currentNote,
        color: c,
        description: text,
        updatedAt: new Date().toISOString(),
      };
      await onSaveNote(updated);
      setCurrentNote(updated);
    }
  };

  const handleKeepInNotes = async () => {
    // Finalize draft: sets isDraft to false
    setIsDraft(false);
    if (text.trim().length > 0) {
      const firstLineTitle = text.trim().split('\n')[0].slice(0, 100);
      const updated: Item = currentNote
        ? {
            ...currentNote,
            isDraft: false,
            description: text,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `note-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            type: 'note',
            title: firstLineTitle,
            description: text,
            completed: false,
            tags: [],
            color: currentColor,
            pinned: isPinned,
            isDraft: false, // Finalized!
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      await onSaveNote(updated);
      setCurrentNote(updated);
    }
  };

  const handleConvertToTask = async () => {
    if (text.trim().length > 0) {
      await flushCommit();
      if (activeNoteRef.current) {
        onConvertToTask(activeNoteRef.current);
      }
    }
  };

  const handleOrganizeSave = async (updatedFields: Partial<Item>, finalizeDraft?: boolean) => {
    if (currentNote) {
      const updated: Item = {
        ...currentNote,
        ...updatedFields,
        description: text,
        isDraft: finalizeDraft !== undefined ? !finalizeDraft : isDraft,
        updatedAt: new Date().toISOString(),
      };
      await onSaveNote(updated);
      setCurrentNote(updated);
      if (finalizeDraft) {
        setIsDraft(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl flex flex-col rounded-none sm:rounded-2xl border-0 sm:border ${colorTheme.borderClass} ${colorTheme.bgClass} shadow-2xl overflow-hidden text-right transition-colors duration-150`}
      >
        {/* Subtle top accent bar */}
        <div className={`h-1.5 w-full ${colorTheme.barClass}`} />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222432]/60 bg-black/20 gap-2">
          {/* Right side: Back / Close & Pin */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="بستن برگه"
            >
              <ArrowRight className="w-4 h-4 sm:hidden" />
              <X className="w-4 h-4 hidden sm:inline" />
              <span className="text-xs">بستن</span>
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={handleTogglePin}
              title={isPinned ? 'برداشتن سنجاق' : 'سنجاق به بالای یادداشت‌ها'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isPinned
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center: Real-time Status Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            {status === 'saving' && (
              <span className="flex items-center gap-1.5 text-violet-300 bg-violet-950/40 px-2 py-0.5 rounded-full border border-violet-800/40">
                <RefreshCw className="w-3 h-3 animate-spin text-violet-400" />
                <span>در حال ذخیره…</span>
              </span>
            )}
            {status === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>ذخیره شد</span>
              </span>
            )}
            {status === 'cached_offline' && (
              <span className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40" title="نوشته روی این مرورگر ذخیره است و با اتصال مجدد همگام می‌شود">
                <CloudOff className="w-3 h-3 text-amber-400" />
                <span>روی این دستگاه ذخیره شد؛ منتظر اتصال</span>
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1 text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-800/40">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>ذخیره ناموفق</span>
              </span>
            )}
            {status === 'idle' && isDraft && (
              <span className="text-[10px] text-amber-300/80 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-800/30">
                پیش‌نویس
              </span>
            )}
          </div>

          {/* Left side: 5 Color Dots */}
          <div className="flex items-center gap-1.5">
            {STICKY_COLOR_LIST.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectColor(c.id)}
                title={c.label}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  currentColor === c.id ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.dotColor }}
              >
                {currentColor === c.id && <Check className="w-3 h-3 text-zinc-950 stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Note Canvas / Textarea */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col min-h-[300px] sm:min-h-[340px]">
          <textarea
            ref={textareaRef}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="الان بنویس، بعداً مرتب کن...&#10;نوشته‌ها به صورت خودکار ذخیره می‌شوند."
            className="flex-1 w-full bg-transparent border-0 text-sm sm:text-base text-gray-100 placeholder-gray-500/70 outline-hidden resize-none leading-relaxed font-sans"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-4 py-3 border-t border-[#222432]/60 bg-black/25 flex flex-wrap items-center justify-between gap-2">
          {/* Draft Finalization & Organize */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <button
                type="button"
                onClick={handleKeepInNotes}
                disabled={!text.trim()}
                title="تثبیت یادداشت و خروج از پیش‌نویس"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>نگهداشتن در یادداشت‌ها</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOrganizeOpen(true)}
              disabled={!text.trim()}
              title="تخصیص عنوان، پروژه یا برچسب اختیاری"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white bg-[#1C1E2A] hover:bg-[#252838] border border-[#2B2E42] transition-colors cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>مرتب‌کردن</span>
            </button>

            {currentNote?.convertedToTaskId ? (
              <span className="flex items-center gap-1 text-[11px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-1 rounded-xl">
                <ListTodo className="w-3.5 h-3.5 text-violet-400" />
                <span>تبدیل‌شده به تسک</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConvertToTask}
                disabled={!text.trim()}
                title="تبدیل این برگه به یک تسک فعال"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-violet-300 hover:text-violet-200 bg-violet-950/30 hover:bg-violet-900/40 border border-violet-800/30 transition-colors cursor-pointer disabled:opacity-40"
              >
                <ListTodo className="w-3.5 h-3.5 text-violet-400" />
                <span>تبدیل به تسک</span>
              </button>
            )}
          </div>

          {/* Delete Option if editing existing */}
          {currentNote && onDeleteNote && (
            <button
              type="button"
              onClick={() => {
                onDeleteNote(currentNote.id);
                clearCache();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              حذف برگه
            </button>
          )}
        </div>
      </div>

      {/* Organize Modal */}
      {isOrganizeOpen && currentNote && (
        <OrganizeNoteModal
          isOpen={isOrganizeOpen}
          note={{ ...currentNote, description: text }}
          projects={projects}
          onClose={() => setIsOrganizeOpen(false)}
          onSave={handleOrganizeSave}
        />
      )}
    </div>
  );
};
