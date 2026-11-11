import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Item, Project, NotesFilterTab, StickyColor } from '../types';
import {
  FileText,
  Search,
  X,
  Plus,
  Pin,
  Folder,
  Sparkles,
  RotateCcw,
  ListTodo,
  CheckCircle2,
} from 'lucide-react';
import { toPersianDigits, getTehranTodayDateString } from '../utils/date';
import { StickyNoteCard } from './StickyNoteCard';
import { StickyNoteEditorModal } from './StickyNoteEditorModal';
import { OrganizeNoteModal } from './OrganizeNoteModal';
import { useAuth } from '../contexts/AuthContext';

interface NotesViewProps {
  items: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
  onUpdateItem?: (item: Item) => void;
  onDeleteItem?: (itemId: string) => void;
  onSelectItem: (item: Item) => void;
  onShowToast?: (message: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSelectItem,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [filterTab, setFilterTab] = useState<NotesFilterTab>('all');

  // Sticky Note Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Item | null>(null);

  // Organize Modal State
  const [organizingNote, setOrganizingNote] = useState<Item | null>(null);

  // Undo Delete State
  const [recentlyDeletedNote, setRecentlyDeletedNote] = useState<Item | null>(null);

  // All note items
  const allNotes = useMemo(() => {
    return items.filter((item) => item.type === 'note');
  }, [items]);

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  // Counts for tabs
  const draftsCount = useMemo(() => {
    return allNotes.filter((n) => n.isDraft === true).length;
  }, [allNotes]);

  const pinnedCount = useMemo(() => {
    return allNotes.filter((n) => n.pinned === true).length;
  }, [allNotes]);

  // Filtered and sorted notes
  const filteredNotes = useMemo(() => {
    let result = allNotes;

    // 1. Filter by Tab: all | drafts | pinned
    if (filterTab === 'drafts') {
      result = result.filter((n) => n.isDraft === true);
    } else if (filterTab === 'pinned') {
      result = result.filter((n) => n.pinned === true);
    }

    // 2. Filter by Project
    if (selectedProjectId !== 'all') {
      if (selectedProjectId === '__unassigned__') {
        result = result.filter((n) => !n.projectId && !n.project);
      } else {
        result = result.filter(
          (n) =>
            n.projectId === selectedProjectId ||
            (!n.projectId && n.project === projects.find((p) => p.id === selectedProjectId)?.name)
        );
      }
    }

    // 3. Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((n) => {
        const titleMatch = n.title?.toLowerCase().includes(q) || false;
        const descMatch = n.description?.toLowerCase().includes(q) || false;
        const projectMatch = n.project?.toLowerCase().includes(q) || false;
        const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        return titleMatch || descMatch || projectMatch || tagMatch;
      });
    }

    // 4. Sort: Pinned first, then by updatedAt or createdAt descending
    return [...result].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [allNotes, filterTab, selectedProjectId, searchQuery, projects]);

  // Save note handler (handles both insert and update)
  const handleSaveNote = useCallback(
    async (noteToSave: Item): Promise<boolean> => {
      const existing = items.find((it) => it.id === noteToSave.id);
      if (existing) {
        if (onUpdateItem) {
          onUpdateItem(noteToSave);
        }
      } else {
        // Add new note
        onAddItem({
          type: 'note',
          title: noteToSave.title,
          description: noteToSave.description,
          completed: false,
          color: noteToSave.color,
          pinned: noteToSave.pinned,
          isDraft: noteToSave.isDraft,
          projectId: noteToSave.projectId,
          project: noteToSave.project,
          tags: noteToSave.tags || [],
          plannedDate: noteToSave.plannedDate,
          inToday: noteToSave.inToday,
          updatedAt: noteToSave.updatedAt,
        });
      }
      return true;
    },
    [items, onAddItem, onUpdateItem]
  );

  // Convert to task idempotently
  const handleConvertToTask = useCallback(
    (note: Item) => {
      if (note.convertedToTaskId) {
        onShowToast?.('این برگه قبلاً به تسک تبدیل شده است.');
        return;
      }

      const taskTitle = (note.title || note.description?.split('\n')[0] || 'وظیفه جدید').trim();
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // 1. Create task with full note description
      onAddItem({
        type: 'task',
        title: taskTitle,
        description: note.description,
        completed: false,
        status: 'todo',
        projectId: note.projectId,
        project: note.project,
        tags: note.tags || [],
        plannedDate: note.plannedDate || getTehranTodayDateString(),
        inToday: true,
      });

      // 2. Link the note to this task and exit draft status
      const updatedNote: Item = {
        ...note,
        convertedToTaskId: taskId,
        isDraft: false,
        updatedAt: new Date().toISOString(),
      };

      if (onUpdateItem) {
        onUpdateItem(updatedNote);
      }

      onShowToast?.('برگه با موفقیت به تسک تبدیل شد.');
    },
    [onAddItem, onUpdateItem, onShowToast]
  );

  // Delete note with undo support
  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const noteToDelete = items.find((i) => i.id === noteId);
      if (noteToDelete) {
        setRecentlyDeletedNote(noteToDelete);
        if (onDeleteItem) {
          onDeleteItem(noteId);
        }
        onShowToast?.('برگه حذف شد.');
      }
    },
    [items, onDeleteItem, onShowToast]
  );

  // Undo delete
  const handleUndoDelete = useCallback(() => {
    if (recentlyDeletedNote) {
      onAddItem({
        type: 'note',
        title: recentlyDeletedNote.title,
        description: recentlyDeletedNote.description,
        completed: false,
        color: recentlyDeletedNote.color,
        pinned: recentlyDeletedNote.pinned,
        isDraft: recentlyDeletedNote.isDraft,
        projectId: recentlyDeletedNote.projectId,
        project: recentlyDeletedNote.project,
        tags: recentlyDeletedNote.tags || [],
        plannedDate: recentlyDeletedNote.plannedDate,
        inToday: recentlyDeletedNote.inToday,
      });
      setRecentlyDeletedNote(null);
      onShowToast?.('برگه بازگردانده شد.');
    }
  }, [recentlyDeletedNote, onAddItem, onShowToast]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Undo Delete Floating Banner if active */}
      {recentlyDeletedNote && (
        <div className="p-2.5 px-3.5 bg-violet-950/70 border border-violet-700/50 rounded-xl flex items-center justify-between text-xs text-violet-200 shadow-md">
          <span>یک برگه حذف شد.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی</span>
          </button>
        </div>
      )}

      {/* Main Top Header & Filter Card */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Title row + Quick Note Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  یادداشت‌ها و برگه‌ها
                </h2>
                <span className="text-[11px] font-normal text-gray-400 bg-[#1A1C24] border border-[#2B2D3B] px-2 py-0.5 rounded-full">
                  {toPersianDigits(allNotes.length)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Note Action Button */}
          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-violet-950/50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ برگهٔ جدید</span>
          </button>
        </div>

        {/* Filters Bar: Tabs & Search & Project */}
        <div className="pt-2 border-t border-[#222432] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Tabs: همه | پیش‌نویس‌ها | سنجاق‌شده‌ها */}
          <div className="flex items-center gap-1.5 p-1 bg-[#12131A] border border-[#232532] rounded-xl overflow-x-auto select-none">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-violet-950/50 text-violet-200 border border-violet-800/40 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>همه</span>
              <span className="text-[10px] opacity-75">({toPersianDigits(allNotes.length)})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('drafts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterTab === 'drafts'
                  ? 'bg-amber-950/40 text-amber-200 border border-amber-800/40 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>پیش‌نویس‌ها</span>
              {draftsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                  {toPersianDigits(draftsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('pinned')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterTab === 'pinned'
                  ? 'bg-violet-950/50 text-violet-200 border border-violet-800/40 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Pin className="w-3 h-3 text-amber-400" />
              <span>سنجاق‌شده‌ها</span>
              {pinnedCount > 0 && (
                <span className="text-[10px] opacity-75">({toPersianDigits(pinnedCount)})</span>
              )}
            </button>
          </div>

          {/* Project dropdown & Search */}
          <div className="flex items-center gap-2 flex-1 md:justify-end">
            {/* Project dropdown filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1.5 bg-[#12131A] border border-[#242634] rounded-xl text-xs text-gray-300 outline-hidden focus:border-violet-500 cursor-pointer"
            >
              <option value="all">همه پروژه‌ها</option>
              <option value="__unassigned__">بدون پروژه</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                dir="auto"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در متن یا برچسب..."
                className="w-full pr-8 pl-7 py-1.5 bg-[#12131A] border border-[#242634] focus:border-violet-500 rounded-xl text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Calm explanatory note for Drafts filter */}
        {filterTab === 'drafts' && (
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>اینجا بنویس؛ هر وقت خواستی مرتبش کن. نوشته‌ها خودکار ذخیره می‌شوند.</span>
          </div>
        )}
      </div>

      {/* Sticky Notes Grid: Multi-column on desktop, single-column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <StickyNoteCard
              key={note.id}
              note={note}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onOpenEditor={(targetNote) => {
                setEditingNote(targetNote);
                setIsEditorOpen(true);
              }}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onConvertToTask={handleConvertToTask}
              onOrganize={(targetNote) => setOrganizingNote(targetNote)}
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400 space-y-3">
            {filterTab === 'drafts' ? (
              <div className="space-y-2">
                <p className="text-gray-300 font-medium">هیچ پیش‌نویسی وجود ندارد.</p>
                <p className="text-[11px] text-gray-500">
                  با کلیک روی «+ برگهٔ جدید» می‌توانید ایده‌ها و افکارتان را بدون هیچ فیلد اولیه‌ای سریع یادداشت کنید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNote(null);
                    setIsEditorOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>نوشتن برگهٔ جدید</span>
                </button>
              </div>
            ) : filterTab === 'pinned' ? (
              <p>هیچ برگه‌ای سنجاق نشده است. با آیکن سنجاق می‌توانید برگه‌های مهم را بالا نگه دارید.</p>
            ) : searchQuery || selectedProjectId !== 'all' ? (
              <div className="space-y-1.5">
                <p>هیچ یادداشتی با فیلترهای انتخابی یافت نشد.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProjectId('all');
                  }}
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer font-medium"
                >
                  نمایش همه یادداشت‌ها
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-300 font-medium">هنوز هیچ برگه‌ای نوشته نشده است.</p>
                <p className="text-[11px] text-gray-500">
                  «الان بنویس، بعداً مرتب کن.» مستقیماً بنویسید و نوشته‌ها خودکار ذخیره می‌شوند.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNote(null);
                    setIsEditorOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ برگهٔ جدید</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Note Editor Modal */}
      {isEditorOpen && (
        <StickyNoteEditorModal
          isOpen={isEditorOpen}
          note={editingNote}
          userId={user?.uid || null}
          projects={projects}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingNote(null);
          }}
          onSaveNote={handleSaveNote}
          onConvertToTask={handleConvertToTask}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {/* Organize Modal */}
      {organizingNote && (
        <OrganizeNoteModal
          isOpen={Boolean(organizingNote)}
          note={organizingNote}
          projects={projects}
          onClose={() => setOrganizingNote(null)}
          onSave={(updatedFields, finalizeDraft) => {
            const updated: Item = {
              ...organizingNote,
              ...updatedFields,
              isDraft: finalizeDraft !== undefined ? !finalizeDraft : organizingNote.isDraft,
              updatedAt: new Date().toISOString(),
            };
            handleSaveNote(updated);
            setOrganizingNote(null);
            onShowToast?.(finalizeDraft ? 'برگه در یادداشت‌ها تثبیت شد.' : 'تغییرات برگه ذخیره شد.');
          }}
        />
      )}
    </div>
  );
};
