import React, { useState } from 'react';
import { Item, Project } from '../types';
import { X, Check, Folder, Tag, Calendar, Sparkles } from 'lucide-react';
import { getTehranTodayDateString, formatJalaliDate } from '../utils/date';

interface OrganizeNoteModalProps {
  isOpen: boolean;
  note: Item;
  projects: Project[];
  onClose: () => void;
  onSave: (updatedFields: Partial<Item>, finalizeDraft?: boolean) => void;
}

export const OrganizeNoteModal: React.FC<OrganizeNoteModalProps> = ({
  isOpen,
  note,
  projects,
  onClose,
  onSave,
}) => {
  const [customTitle, setCustomTitle] = useState(note.title || '');
  const [projectId, setProjectId] = useState(note.projectId || '');
  const [tagsInput, setTagsInput] = useState((note.tags || []).join('، '));
  const [plannedDate, setPlannedDate] = useState(note.plannedDate || '');

  if (!isOpen) return null;

  const activeProjects = projects.filter((p) => !p.archived);

  const handleApplyChanges = (finalize: boolean) => {
    const selectedProj = projects.find((p) => p.id === projectId);
    const parsedTags = tagsInput
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: Partial<Item> = {
      title: customTitle.trim() || note.description?.trim().split('\n')[0].slice(0, 100) || 'برگه',
      projectId: projectId || undefined,
      project: selectedProj?.name || undefined,
      tags: parsedTags,
      plannedDate: plannedDate || undefined,
      inToday: plannedDate === getTehranTodayDateString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updated, finalize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[#15161E] border border-[#262838] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222432] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-950/50 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">مرتب‌کردن برگه</h3>
              <p className="text-[11px] text-gray-400">تمام گزینه‌ها اختیاری هستند؛ هر آنچه نیاز داری مشخص کن.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1E202C] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300">عنوان برگه (اختیاری):</label>
            <input
              type="text"
              dir="auto"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="در صورت خالی بودن، خط اول نوشته استفاده می‌شود"
              className="w-full px-3 py-2 bg-[#12131A] border border-[#242636] focus:border-violet-500 rounded-xl text-xs text-gray-100 placeholder-gray-500 outline-hidden transition-colors"
            />
          </div>

          {/* Project */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Folder className="w-3.5 h-3.5 text-violet-400" />
              <span>پروژه (اختیاری):</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-[#12131A] border border-[#242636] focus:border-violet-500 rounded-xl text-xs text-gray-200 outline-hidden cursor-pointer"
            >
              <option value="">بدون پروژه (عمومی)</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Tag className="w-3.5 h-3.5 text-violet-400" />
              <span>برچسب‌ها (با کاما جدا کنید):</span>
            </label>
            <input
              type="text"
              dir="auto"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="مثال: ایده، خرید، طراحی"
              className="w-full px-3 py-2 bg-[#12131A] border border-[#242636] focus:border-violet-500 rounded-xl text-xs text-gray-100 placeholder-gray-500 outline-hidden transition-colors"
            />
          </div>

          {/* Planned Date */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>تاریخ برنامه‌ریزی (اختیاری):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#12131A] border border-[#242636] focus:border-violet-500 rounded-xl text-xs text-gray-200 outline-hidden"
              />
              <button
                type="button"
                onClick={() => setPlannedDate(getTehranTodayDateString())}
                className="px-2.5 py-1.5 text-xs font-medium bg-[#1F202D] hover:bg-violet-950/60 border border-[#2D3042] text-violet-300 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                امروز
              </button>
              {plannedDate && (
                <button
                  type="button"
                  onClick={() => setPlannedDate('')}
                  className="px-2 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  حذف تاریخ
                </button>
              )}
            </div>
            {plannedDate && (
              <span className="text-[11px] text-gray-400 font-mono block mt-1">
                {formatJalaliDate(plannedDate, 'full')}
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-[#222432] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {note.isDraft ? (
            <button
              type="button"
              onClick={() => handleApplyChanges(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-200 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>نهایی‌کردن و خروج از پیش‌نویس</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-gray-400 hover:text-white rounded-xl hover:bg-[#1E202C] transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => handleApplyChanges(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
