import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Item, Project, StickyColor } from '../types';
import { STICKY_COLOR_THEMES, STICKY_COLOR_LIST } from '../utils/stickyColors';
import {
  Pin,
  MoreVertical,
  Check,
  Sparkles,
  ListTodo,
  Trash2,
  Folder,
  Tag,
  Clock,
} from 'lucide-react';
import { formatJalaliDate } from '../utils/date';

interface StickyNoteCardProps {
  note: Item;
  projects: Project[];
  isSimpleMode: boolean;
  onOpenEditor: (note: Item) => void;
  onSaveNote: (note: Item) => Promise<boolean>;
  onDeleteNote: (noteId: string) => void;
  onConvertToTask: (note: Item) => void;
  onOrganize: (note: Item) => void;
}

export const StickyNoteCard: React.FC<StickyNoteCardProps> = ({
  note,
  projects,
  isSimpleMode,
  onOpenEditor,
  onSaveNote,
  onDeleteNote,
  onConvertToTask,
  onOrganize,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineText, setInlineText] = useState(note.description || note.title || '');
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);

  const updateMenuPosition = () => {
    if (!triggerButtonRef.current) return;
    const rect = triggerButtonRef.current.getBoundingClientRect();
    const menuWidth = 192; // 12rem / w-48
    const estimatedHeight = 260;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const spaceBelow = windowHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const availableHeight = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(140, Math.min(availableHeight, 360));

    let left = rect.left;
    if (left + menuWidth > windowWidth - 8) {
      left = windowWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setMenuPos({
      left,
      top: openAbove ? undefined : rect.bottom + 4,
      bottom: openAbove ? windowHeight - rect.top + 4 : undefined,
      maxHeight,
    });
  };

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
      setIsMenuOpen(false);
      setMenuPos(null);
    } else {
      updateMenuPosition();
      setIsMenuOpen(true);
    }
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    setMenuPos(null);
  };

  // Close menu on outside click, window scroll, resize, or Escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        portalMenuRef.current &&
        !portalMenuRef.current.contains(target) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        handleCloseMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseMenu();
        triggerButtonRef.current?.focus();
      }
    };

    const handleWindowChange = () => {
      handleCloseMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleWindowChange, true);
    window.addEventListener('resize', handleWindowChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleWindowChange, true);
      window.removeEventListener('resize', handleWindowChange);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setInlineText(note.description || note.title || '');
  }, [note.description, note.title]);

  const colorTheme = STICKY_COLOR_THEMES[note.color || 'default'] || STICKY_COLOR_THEMES.default;

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveNote({
      ...note,
      pinned: !note.pinned,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectColor = (c: StickyColor, e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveNote({
      ...note,
      color: c,
      updatedAt: new Date().toISOString(),
    });
    setIsMenuOpen(false);
  };

  const handleKeepInNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveNote({
      ...note,
      isDraft: false,
      updatedAt: new Date().toISOString(),
    });
    setIsMenuOpen(false);
  };

  const handleInlineBlur = () => {
    setIsInlineEditing(false);
    const trimmed = inlineText.trim();
    if (trimmed && trimmed !== (note.description || note.title)) {
      const firstLineTitle = trimmed.split('\n')[0].slice(0, 100);
      onSaveNote({
        ...note,
        title: note.title && note.title !== (note.description || '').split('\n')[0].slice(0, 100)
          ? note.title
          : firstLineTitle,
        description: inlineText,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const project = projects.find((p) => p.id === note.projectId);

  // Text display logic:
  // If note has a distinct explicit title from custom organize, display title + description.
  // Otherwise, display description directly (first line will naturally stand out).
  const fullContent = (note.description || note.title || '').trim();
  const lines = fullContent.split('\n');
  const firstLine = lines[0] || '';
  const remainingLines = lines.slice(1).join('\n').trim();

  const hasExplicitTitle = Boolean(
    note.title &&
    note.description &&
    note.title !== firstLine &&
    note.title !== note.description
  );

  return (
    <div
      onClick={() => {
        if (!isInlineEditing) {
          onOpenEditor(note);
        }
      }}
      className={`group relative rounded-2xl border ${colorTheme.borderClass} ${colorTheme.bgClass} hover:border-[#383B52] transition-all duration-150 flex flex-col justify-between text-right cursor-pointer shadow-sm hover:shadow-md overflow-hidden select-none min-h-[160px]`}
    >
      {/* Subtle top color bar */}
      <div className={`h-1.5 w-full ${colorTheme.barClass}`} />

      {/* Top action row */}
      <div className="flex items-center justify-between p-3 pb-1 gap-2">
        {/* Right side: Draft Badge & Converted Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.isDraft && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="پیش‌نویس ذخیره‌شده (برای نهایی‌کردن از منو گزینه «نگهداشتن در یادداشت‌ها» را انتخاب کنید)"
            >
              پیش‌نویس
            </span>
          )}

          {note.convertedToTaskId && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40">
              <ListTodo className="w-3 h-3 text-violet-400" />
              <span>تسک</span>
            </span>
          )}

          {!isSimpleMode && project && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-black/30 border border-[#262838] text-gray-300 truncate max-w-[110px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <span className="truncate">{project.name}</span>
            </span>
          )}
        </div>

        {/* Left side: Pin button & 3-dots menu button */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Pin toggle button */}
          <button
            type="button"
            onClick={handleTogglePin}
            title={note.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن برگه'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              note.pinned
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
          </button>

          {/* 3-dots Menu Button */}
          <div className="relative">
            <button
              ref={triggerButtonRef}
              type="button"
              onClick={handleOpenMenu}
              aria-label="گزینه‌های برگه"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              title="گزینه‌های برگه"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu Portal */}
            {isMenuOpen &&
              menuPos &&
              createPortal(
                <div
                  ref={portalMenuRef}
                  role="menu"
                  aria-label="منوی گزینه‌های برگه"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    left: `${menuPos.left}px`,
                    top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
                    bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
                    maxHeight: `${menuPos.maxHeight}px`,
                  }}
                  className="fixed z-50 w-48 bg-[#181924] border border-[#2D3044] rounded-xl shadow-2xl p-1.5 space-y-0.5 text-right text-xs overflow-y-auto animate-in fade-in duration-100"
                >
                  {/* 1. Organize */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseMenu();
                      onOrganize(note);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-gray-200 hover:bg-[#25283C] hover:text-white transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>مرتب‌کردن برگه</span>
                  </button>

                  {/* 2. Keep in notes / Finalize */}
                  {note.isDraft && (
                    <button
                      type="button"
                      onClick={(e) => {
                        handleKeepInNotes(e);
                        handleCloseMenu();
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>نگهداشتن در یادداشت‌ها</span>
                    </button>
                  )}

                  {/* 3. Convert to Task */}
                  {!note.convertedToTaskId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseMenu();
                        onConvertToTask(note);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-violet-300 hover:bg-violet-950/40 transition-colors cursor-pointer"
                    >
                      <ListTodo className="w-3.5 h-3.5 text-violet-400" />
                      <span>تبدیل به تسک</span>
                    </button>
                  )}

                  {/* 4. Pin / Unpin */}
                  <button
                    type="button"
                    onClick={(e) => {
                      handleTogglePin(e);
                      handleCloseMenu();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-gray-200 hover:bg-[#25283C] transition-colors cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{note.pinned ? 'برداشتن سنجاق' : 'سنجاق به بالا'}</span>
                  </button>

                  {/* 5. Colors Row */}
                  <div className="pt-1.5 pb-1 px-2 border-t border-[#26283C]">
                    <span className="text-[10px] text-gray-400 block mb-1.5">انتخاب رنگ:</span>
                    <div className="flex items-center justify-between">
                      {STICKY_COLOR_LIST.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) => {
                            handleSelectColor(c.id, e);
                            handleCloseMenu();
                          }}
                          title={c.label}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            (note.color || 'default') === c.id ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.dotColor }}
                        >
                          {(note.color || 'default') === c.id && (
                            <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. Delete */}
                  <div className="pt-1 border-t border-[#26283C]">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseMenu();
                        onDeleteNote(note.id);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>حذف برگه</span>
                    </button>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Note Body Content */}
      <div className="p-3.5 pt-1.5 flex-1 flex flex-col justify-start">
        {isInlineEditing ? (
          <textarea
            ref={inlineTextareaRef}
            dir="auto"
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            onBlur={handleInlineBlur}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full min-h-[90px] bg-transparent border-0 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-hidden resize-none leading-relaxed"
            autoFocus
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              // Direct desktop in-place edit on double click
              e.stopPropagation();
              setIsInlineEditing(true);
            }}
            className="space-y-1.5"
          >
            {hasExplicitTitle && (
              <h4 dir="auto" className="text-xs sm:text-sm font-bold text-gray-100 leading-snug">
                {note.title}
              </h4>
            )}

            {firstLine && (
              <p
                dir="auto"
                className={`text-xs sm:text-sm leading-relaxed text-gray-200 line-clamp-4 ${
                  !hasExplicitTitle ? 'font-medium' : 'text-gray-300'
                }`}
              >
                {hasExplicitTitle ? note.description : fullContent}
              </p>
            )}

            {!fullContent && (
              <p className="text-xs text-gray-500 italic">برگه خالی</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Details (Tags & Date) */}
      {!isSimpleMode && (note.tags?.length > 0 || note.plannedDate) && (
        <div className="px-3.5 py-2 border-t border-[#222432]/40 flex items-center justify-between text-[10px] text-gray-500 gap-2">
          <div className="flex items-center gap-1 truncate">
            {note.tags?.slice(0, 3).map((t, idx) => (
              <span key={idx} className="text-gray-400 font-normal">
                #{t}
              </span>
            ))}
          </div>

          {note.plannedDate && (
            <span className="flex items-center gap-1 font-mono text-violet-300 shrink-0">
              <Clock className="w-2.5 h-2.5 text-violet-400" />
              <span>{formatJalaliDate(note.plannedDate, 'short')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
