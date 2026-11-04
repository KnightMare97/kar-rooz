import React, { useState, useMemo } from 'react';
import { Item, ItemType, Project } from '../types';
import { CheckCircle2, FileText, ChevronDown, ChevronUp, Plus, Tag as TagIcon, Folder } from 'lucide-react';
import { getTehranTodayDateString } from '../utils/date';

interface QuickCaptureProps {
  projects?: Project[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt'>) => void;
  isSimpleMode: boolean;
}

export const QuickCapture: React.FC<QuickCaptureProps> = ({
  projects = [],
  onAddItem,
  isSimpleMode,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ItemType>('task');
  const [isExpanded, setIsExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Active projects for selection
  const activeProjects = useMemo(() => {
    return projects.filter((p) => !p.archived);
  }, [projects]);

  // Check if draft has secondary content
  const hasExtraDraft = useMemo(() => {
    return Boolean(description.trim() || selectedProjectId || tagsInput.trim());
  }, [description, selectedProjectId, tagsInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const chosenProj = activeProjects.find((p) => p.id === selectedProjectId);
    const todayStr = getTehranTodayDateString();

    onAddItem({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      completed: false,
      status: type === 'task' ? 'todo' : undefined,
      projectId: selectedProjectId || undefined,
      project: chosenProj?.name,
      tags: parsedTags,
      plannedDate: todayStr, // New capture on Today explicitly defaults plannedDate to today's date
      inToday: true,
      destination: 'today',
    });

    // Reset draft and collapse extra fields after successful creation
    setTitle('');
    setDescription('');
    setTagsInput('');
    setSelectedProjectId('');
    setIsExpanded(false);
  };

  const handleCancel = () => {
    // Clear draft and collapse extra fields
    setTitle('');
    setDescription('');
    setTagsInput('');
    setSelectedProjectId('');
    setIsExpanded(false);
  };

  return (
    <div className="bg-[#16171E] border border-[#252733] rounded-xl p-2.5 sm:p-3 shadow-xs transition-colors focus-within:border-violet-500/50">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Compact Single-Row Capture Bar */}
        <div className="flex items-center gap-2">
          {/* Item Type Selector */}
          <div className="flex items-center p-0.5 bg-[#111217] rounded-lg border border-[#232532] shrink-0">
            <button
              type="button"
              onClick={() => setType('task')}
              title="تسک (کار قابل انجام)"
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                type === 'task'
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/40 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">تسک</span>
            </button>
            <button
              type="button"
              onClick={() => setType('note')}
              title="یادداشت متنی"
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                type === 'note'
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/40 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">یادداشت</span>
            </button>
          </div>

          {/* Title Input with Quiet Destination Badge */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <input
              type="text"
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'task' ? 'ثبت تسک جدید...' : 'ثبت یادداشت جدید...'}
              className="w-full bg-transparent border-0 px-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden"
            />
            <span
              className="hidden sm:inline-block text-[11px] text-violet-300/80 bg-violet-950/30 px-2 py-0.5 rounded-md shrink-0 pointer-events-none select-none border border-violet-800/30"
              title="این مورد به مجموعه کارهای امروز شما افزوده می‌شود"
            >
              برای امروز
            </span>
          </div>

          {/* Details Toggle Button */}
          {!isSimpleMode && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer shrink-0 border ${
                isExpanded || hasExtraDraft
                  ? 'bg-[#20222D] text-violet-300 border-violet-500/30'
                  : 'bg-transparent text-gray-400 hover:text-gray-200 border-transparent hover:bg-[#1E202B]'
              }`}
              title={isExpanded ? 'پنهان کردن فیلدهای بیشتر' : 'نمایش فیلدهای پروژه، توضیحات و برچسب'}
            >
              <span className="hidden md:inline">{isExpanded ? 'کمتر' : 'جزئیات'}</span>
              {hasExtraDraft && !isExpanded && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              )}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 disabled:hover:bg-violet-600 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">ثبت</span>
          </button>
        </div>

        {/* Expandable Extra Fields (Collapsed until requested; draft state preserved on toggle) */}
        {isExpanded && !isSimpleMode && (
          <div className="pt-2.5 border-t border-[#232532] space-y-2.5 animate-in fade-in duration-150">
            {/* Description Textarea */}
            <div>
              <textarea
                dir="auto"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات تکمیلی (اختیاری)..."
                className="w-full px-3 py-2 bg-[#111217] border border-[#252733] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Project Picker & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Project Picker */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Folder className="w-3 h-3 text-gray-400" />
                  پروژه
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId('')}
                    className={`px-2 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer border ${
                      selectedProjectId === ''
                        ? 'bg-violet-950/40 text-violet-300 border-violet-700/50'
                        : 'bg-[#111217] text-gray-400 border-[#252733] hover:text-gray-200'
                    }`}
                  >
                    بدون پروژه
                  </button>
                  {activeProjects.map((p) => {
                    const isSelected = selectedProjectId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-[#27243B] text-white border-violet-500/50'
                            : 'bg-[#111217] text-gray-300 border-[#252733] hover:bg-[#1A1B24]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Input */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <TagIcon className="w-3 h-3 text-gray-400" />
                  برچسب‌ها
                </span>
                <input
                  type="text"
                  dir="auto"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="مثال: اولویت، بررسی (با کاما)"
                  className="w-full px-2.5 py-1 bg-[#111217] border border-[#252733] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Bottom Row inside expanded details: Help text + Collapse / Clear buttons */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#20222D] text-[11px]">
              <span className="text-gray-400">
                مورد در مجموعه «امروز» قرار می‌گیرد (نه به عنوان ددلاین اجباری).
              </span>

              <div className="flex items-center gap-2">
                {hasExtraDraft && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    پاک کردن
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-violet-400 hover:text-violet-300 transition-colors cursor-pointer font-medium"
                >
                  بستن جزئیات
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
