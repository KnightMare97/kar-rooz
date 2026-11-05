import React, { useState, useMemo } from 'react';
import { Item, Project } from '../types';
import {
  FileText,
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Sun,
  Clock,
  Tag as TagIcon,
  Folder,
} from 'lucide-react';
import { toPersianDigits, formatJalaliDate, getTehranTodayDateString } from '../utils/date';

interface NotesViewProps {
  items: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
  onSelectItem: (item: Item) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onAddItem,
  onSelectItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Quick Capture State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');
  const [inToday, setInToday] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // All notes
  const allNotes = useMemo(() => {
    return items.filter((item) => item.type === 'note');
  }, [items]);

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  // Filtered notes by project and search
  const filteredNotes = useMemo(() => {
    let result = allNotes;

    if (selectedProjectId !== 'all') {
      if (selectedProjectId === '__unassigned__') {
        result = result.filter((n) => !n.projectId && !n.project);
      } else {
        result = result.filter(
          (n) => n.projectId === selectedProjectId || (!n.projectId && n.project === projects.find((p) => p.id === selectedProjectId)?.name)
        );
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const descMatch = n.description?.toLowerCase().includes(q) || false;
        const projectMatch = n.project?.toLowerCase().includes(q) || false;
        const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        return titleMatch || descMatch || projectMatch || tagMatch;
      });
    }

    return result;
  }, [allNotes, selectedProjectId, searchQuery, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenProj = projects.find((p) => p.id === projectId);
    const parsedTags = tags
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onAddItem({
      type: 'note',
      title: title.trim(),
      description: description.trim() || undefined,
      completed: false,
      projectId: projectId || undefined,
      project: chosenProj?.name,
      tags: parsedTags,
      plannedDate: inToday ? getTehranTodayDateString() : undefined,
      inToday,
      destination: inToday ? 'today' : undefined,
    });

    setTitle('');
    setDescription('');
    setTags('');
    setInToday(false);
    setIsExpanded(false);
  };

  const getProjectInfo = (note: Item) => {
    if (!note.projectId && !note.project) return null;
    const proj = projects.find((p) => p.id === note.projectId);
    return {
      name: proj?.name || note.project || 'پروژه',
      color: proj?.color || '#818CF8',
    };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Search & Project Filter Bar */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">یادداشت‌ها</h2>
            <span className="text-[11px] font-normal text-gray-400 bg-[#1A1C24] border border-[#2B2D3B] px-2 py-0.5 rounded-full">
              {toPersianDigits(filteredNotes.length)} یادداشت
            </span>
          </div>

          {/* Project dropdown filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">فیلتر پروژه:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-300 outline-hidden focus:border-violet-500 cursor-pointer"
            >
              <option value="all">همه پروژه‌ها ({toPersianDigits(allNotes.length)})</option>
              <option value="__unassigned__">بدون پروژه</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            dir="auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن، عنوان یا برچسب یادداشت‌ها..."
            className="w-full pr-8 pl-7 py-1.5 bg-[#121318] border border-[#242634] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
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

      {/* Quick Capture Note */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-violet-300 bg-[#27243B] border border-violet-500/30 rounded-lg shrink-0">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span>یادداشت جدید</span>
            </div>

            <input
              type="text"
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان یا ایده یادداشت جدید..."
              className="flex-1 bg-transparent border-0 px-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden"
            />

            {!isSimpleMode && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                title="توضیحات و پروژه"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت</span>
            </button>
          </div>

          {isExpanded && !isSimpleMode && (
            <div className="pt-2 border-t border-[#20222D] space-y-2.5 animate-in fade-in duration-150">
              <textarea
                dir="auto"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="متن کامل یا توضیحات یادداشت..."
                className="w-full px-3 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500 resize-none leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-300 outline-hidden focus:border-violet-500"
                >
                  <option value="">بدون پروژه (عمومی)</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  dir="auto"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="برچسب‌ها (با کاما)"
                  className="flex-1 px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-300 placeholder-gray-500 outline-hidden focus:border-violet-500"
                />

                <label className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={inToday}
                    onChange={(e) => setInToday(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <Sun className="w-3 h-3 text-violet-400" />
                  <span>انجام در امروز</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => {
            const projectInfo = getProjectInfo(note);
            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectItem(note)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(note);
                  }
                }}
                className="group p-3.5 rounded-xl bg-[#16171E] border border-[#232532] hover:border-[#2F3244] hover:bg-[#1B1D27] transition-all text-right cursor-pointer flex flex-col justify-between gap-2.5 select-none"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <h4 dir="auto" className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-relaxed truncate">
                        {note.title}
                      </h4>
                    </div>

                    {note.inToday && (
                      <span className="text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded font-medium shrink-0">
                        در امروز
                      </span>
                    )}
                  </div>

                  {note.description && (
                    <p dir="auto" className="text-[11px] text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                      {note.description}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#23242E] text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5 truncate">
                    {projectInfo && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#111218] border border-[#232532] text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectInfo.color }} />
                        <span className="truncate max-w-[100px]">{projectInfo.name}</span>
                      </span>
                    )}

                    {note.tags?.slice(0, 2).map((t, i) => (
                      <span key={i} className="text-gray-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {note.plannedDate && (
                    <span className="inline-flex items-center gap-1 text-violet-300 font-mono">
                      <Clock className="w-2.5 h-2.5 text-violet-400" />
                      <span>{formatJalaliDate(note.plannedDate, 'short')}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400 space-y-2">
            {searchQuery || selectedProjectId !== 'all' ? (
              <>
                <p>هیچ یادداشتی با فیلترهای انتخابی یا عبارت جستجو یافت نشد.</p>
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
              </>
            ) : (
              <p>هنوز یادداشتی ثبت نشده است. با کادر بالا می‌توانید اولین یادداشت خود را ایجاد کنید.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
