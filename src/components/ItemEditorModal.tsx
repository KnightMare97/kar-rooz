import React, { useState, useEffect } from 'react';
import { Item, ItemType, Project, KanbanStatus, KANBAN_COLUMNS, RecurrenceRule, TaskStep } from '../types';
import {
  X,
  Trash2,
  CheckCircle2,
  FileText,
  Tag as TagIcon,
  Folder,
  AlertCircle,
  Sun,
  AlertTriangle,
  Calendar,
  Clock,
  Repeat,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DatePickerModal } from './DatePickerModal';
import { RecurrenceSection } from './RecurrenceSection';
import { TaskStepsSection } from './TaskStepsSection';
import { CompleteTaskConfirmModal } from './CompleteTaskConfirmModal';
import {
  getTehranTodayDateString,
  getTomorrowDateString,
  formatJalaliDate,
  isTodayDate,
} from '../utils/date';

interface ItemEditorModalProps {
  item: Item | null;
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: Item) => void;
  onDelete: (itemId: string) => void;
  onOpenSeriesModal?: (seriesId: string) => void;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  item,
  projects = [],
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenSeriesModal,
}) => {
  const todayStr = getTehranTodayDateString();
  const tomorrowStr = getTomorrowDateString(todayStr);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ItemType>('task');
  const [status, setStatus] = useState<KanbanStatus>('todo');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [tagsInput, setTagsInput] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [isConfirmOpenStepsModalOpen, setIsConfirmOpenStepsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Date picker modal state
  const [datePickerTarget, setDatePickerTarget] = useState<'planned' | 'due' | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setType(item.type);
      setStatus(item.status || (item.completed ? 'done' : 'todo'));
      setDescription(item.description || '');
      setSelectedProjectId(item.projectId || '');
      setPlannedDate(item.plannedDate);
      setDueDate(item.dueDate);
      setTagsInput(item.tags?.join('، ') || '');
      setRecurrence(item.recurrence);
      setSteps(item.steps ? JSON.parse(JSON.stringify(item.steps)) : []);
      setIsConfirmOpenStepsModalOpen(false);
      setError('');
      setIsDeleteConfirmOpen(false);
      setDatePickerTarget(null);
    }
  }, [item, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (datePickerTarget) {
          setDatePickerTarget(null);
        } else if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, datePickerTarget, isDeleteConfirmOpen, onClose]);

  if (!isOpen || !item) return null;

  const isPlannedForToday = plannedDate ? isTodayDate(plannedDate, todayStr) : false;

  const handleToggleTodayMembership = (checked: boolean) => {
    if (checked) {
      setPlannedDate(todayStr);
    } else {
      setPlannedDate(undefined);
    }
  };

  // Warning check: plannedDate > dueDate
  const isDateOrderInverted =
    type === 'task' && plannedDate && dueDate && plannedDate > dueDate;

  const handleSelectStatus = (newStatus: KanbanStatus) => {
    if (newStatus === 'done') {
      const openSteps = steps.filter((s) => s.text.trim().length > 0 && !s.completed);
      if (openSteps.length > 0) {
        setIsConfirmOpenStepsModalOpen(true);
        return;
      }
    }
    setStatus(newStatus);
  };

  const executeSave = (finalStatus: KanbanStatus, finalSteps: TaskStep[]) => {
    const parsedTags = tagsInput
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const chosenProject = projects.find((p) => p.id === selectedProjectId);
    const isDone = finalStatus === 'done';
    const cleanSteps = finalSteps.filter((s) => s.text.trim().length > 0);

    const updatedItem: Item = {
      ...item,
      title: title.trim(),
      type,
      description: description.trim() || undefined,
      projectId: selectedProjectId || undefined,
      project: chosenProject ? chosenProject.name : selectedProjectId ? item.project : undefined,
      legacyProjectLabel: selectedProjectId ? undefined : item.legacyProjectLabel,
      tags: parsedTags,
      // Date fields
      plannedDate: plannedDate || undefined,
      dueDate: type === 'task' ? dueDate || undefined : undefined,
      inToday: plannedDate === todayStr,
      destination: plannedDate === todayStr ? 'today' : undefined,
      // Recurrence rule (tasks only, notes do not recur)
      recurrence: type === 'task' && !item.isRecurringOccurrence ? recurrence : item.recurrence,
      // Completion and status
      completed: type === 'note' ? false : isDone,
      status: type === 'task' ? finalStatus : undefined,
      completedAt:
        type === 'task' && isDone ? item.completedAt || new Date().toISOString() : undefined,
      // Steps: active on tasks, preserved if switched to note
      steps: type === 'task' ? (cleanSteps.length > 0 ? cleanSteps : undefined) : item.steps,
    };

    onSave(updatedItem);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('عنوان نمی‌تواند خالی باشد.');
      return;
    }

    const cleanSteps = steps.filter((s) => s.text.trim().length > 0);
    const hasOpenSteps = cleanSteps.some((s) => !s.completed);

    if (type === 'task' && status === 'done' && hasOpenSteps && !isConfirmOpenStepsModalOpen) {
      setIsConfirmOpenStepsModalOpen(true);
      return;
    }

    executeSave(status, steps);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    onDelete(item.id);
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-[#181920] border-t sm:border border-[#2D2F3C] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Indicator Bar */}
          <div className="w-12 h-1.5 bg-gray-600/40 rounded-full mx-auto mt-2.5 sm:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262835]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-[#222430] px-2.5 py-1 rounded-md">
                {type === 'task' ? 'ویرایش تسک' : 'ویرایش یادداشت'}
              </span>
              {isPlannedForToday && (
                <span className="text-xs text-violet-400/90 font-medium">· برنامه‌ریزی‌شده برای امروز</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#232532] rounded-lg transition-colors cursor-pointer"
              aria-label="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Type Switcher */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">نوع مورد</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#121318] rounded-xl border border-[#262835]">
                <button
                  type="button"
                  onClick={() => setType('task')}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    type === 'task'
                      ? 'bg-[#29263E] text-violet-200 border border-violet-500/30 shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  <span>تسک (قابل انجام / کانبان)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('note')}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    type === 'note'
                      ? 'bg-[#29263E] text-violet-200 border border-violet-500/30 shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span>یادداشت (بدون چک‌باکس و مهلت)</span>
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="edit-title" className="block text-xs font-medium text-gray-300 mb-1.5">
                عنوان <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-title"
                type="text"
                dir="auto"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-[#121318] border border-[#2B2D3A] focus:border-violet-500 rounded-xl text-sm text-gray-100 placeholder-gray-500 outline-hidden transition-colors"
                placeholder="عنوان مورد را وارد کنید..."
              />
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Date-Based Planning Section: Planned Date & Due Date */}
            <div className="p-3.5 bg-[#14151C] rounded-xl border border-[#262835] space-y-3">
              {/* Field 1: Planned Date (روز انجام) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    <span>روز انجام (برنامه‌ریزی)</span>
                  </div>
                  {plannedDate ? (
                    <span className="text-xs text-violet-300 font-medium">
                      {formatJalaliDate(plannedDate, 'full')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">تعیین‌نشده</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPlannedDate(todayStr)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                      plannedDate === todayStr
                        ? 'bg-violet-950/50 text-violet-200 border-violet-700/60 font-medium'
                        : 'bg-[#181920] text-gray-400 border-[#262835] hover:text-gray-200'
                    }`}
                  >
                    امروز
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlannedDate(tomorrowStr)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                      plannedDate === tomorrowStr
                        ? 'bg-violet-950/50 text-violet-200 border-violet-700/60 font-medium'
                        : 'bg-[#181920] text-gray-400 border-[#262835] hover:text-gray-200'
                    }`}
                  >
                    فردا
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePickerTarget('planned')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-[#181920] text-gray-300 border border-[#262835] hover:text-white hover:bg-[#20222D] cursor-pointer"
                  >
                    انتخاب تاریخ...
                  </button>
                  {plannedDate && (
                    <button
                      type="button"
                      onClick={() => setPlannedDate(undefined)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 cursor-pointer mr-auto"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              {/* Field 2: Due Date (مهلت تحویل) - Tasks Only */}
              {type === 'task' && (
                <div className="pt-2.5 border-t border-[#20222D]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>مهلت تحویل (ددلاین)</span>
                    </div>
                    {dueDate ? (
                      <span className="text-xs text-amber-300 font-medium">
                        {formatJalaliDate(dueDate, 'full')}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">تعیین‌نشده</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDueDate(todayStr)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                        dueDate === todayStr
                          ? 'bg-amber-950/40 text-amber-200 border-amber-700/60 font-medium'
                          : 'bg-[#181920] text-gray-400 border-[#262835] hover:text-gray-200'
                      }`}
                    >
                      امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(tomorrowStr)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                        dueDate === tomorrowStr
                          ? 'bg-amber-950/40 text-amber-200 border-amber-700/60 font-medium'
                          : 'bg-[#181920] text-gray-400 border-[#262835] hover:text-gray-200'
                      }`}
                    >
                      فردا
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatePickerTarget('due')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#181920] text-gray-300 border border-[#262835] hover:text-white hover:bg-[#20222D] cursor-pointer"
                    >
                      انتخاب تاریخ...
                    </button>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate(undefined)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 cursor-pointer mr-auto"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Inversion Warning: plannedDate > dueDate */}
              {isDateOrderInverted && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    توجه: روز انجام بعد از مهلت تحویل تعیین شده است. هر دو مقدار طبق انتخاب شما ذخیره خواهند شد.
                  </span>
                </div>
              )}

              {/* Date-Aware "نمایش در امروز" Toggle */}
              <div className="pt-2 border-t border-[#20222D] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-violet-400 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-gray-200 block">برنامه‌ریزی برای امروز</span>
                    <span className="text-[10px] text-gray-500">
                      فعال‌سازی این گزینه، روز انجام را روی تاریخ امروز تنظیم می‌کند.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="modal-toggle-in-today"
                  checked={isPlannedForToday}
                  onChange={(e) => handleToggleTodayMembership(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer shrink-0"
                />
              </div>
            </div>

            {/* Recurrence Zone: Occurrence Notice vs Series Recurrence Section */}
            {item.isRecurringOccurrence ? (
              <div className="p-3.5 rounded-xl bg-violet-950/25 border border-violet-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-300 font-semibold text-xs">
                    <Repeat className="w-4 h-4 text-violet-400" />
                    <span>نوبت تکرارشونده</span>
                  </div>
                  {onOpenSeriesModal && item.recurringSeriesId && (
                    <button
                      type="button"
                      onClick={() => onOpenSeriesModal(item.recurringSeriesId!)}
                      className="text-[11px] text-violet-300 hover:text-white underline underline-offset-2 cursor-pointer"
                    >
                      مشاهده مجموعه تکرار...
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  این مورد یک نوبت مستقل از مجموعه تکرار است. هر تغییری در عنوان، مهلت یا جابجایی روز انجام فقط بر روی همین نوبت اعمال خواهد شد و نوبت‌های دیگر دست‌نخورده می‌مانند.
                </p>
              </div>
            ) : type === 'task' ? (
              <RecurrenceSection
                rule={recurrence}
                onChange={setRecurrence}
                plannedDate={plannedDate}
                dueDate={dueDate}
                onSetPlannedDate={(d) => setPlannedDate(d)}
                isOccurrence={false}
              />
            ) : null}

            {/* Workflow Status (Only for Tasks) */}
            {type === 'task' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">وضعیت کانبان</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121318] rounded-xl border border-[#262835]">
                  {KANBAN_COLUMNS.map((col) => {
                    const isSelected = status === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => handleSelectStatus(col.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#27243B] text-white border border-violet-500/40 shadow-xs'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.color }}
                        />
                        <span>{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Checklist / Steps Section (Tasks Only) */}
            {type === 'task' && (
              <TaskStepsSection
                steps={steps}
                onChange={setSteps}
                isTaskCompleted={status === 'done'}
                onSetTaskStatus={(nextStatus) => {
                  if (nextStatus === 'done') {
                    handleSelectStatus('done');
                  } else {
                    setStatus(nextStatus);
                  }
                }}
              />
            )}

            {/* Description Input */}
            <div>
              <label htmlFor="edit-description" className="block text-xs font-medium text-gray-400 mb-1.5">
                توضیحات (اختیاری)
              </label>
              <textarea
                id="edit-description"
                dir="auto"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#121318] border border-[#2B2D3A] focus:border-violet-500 rounded-xl text-sm text-gray-100 placeholder-gray-500 outline-hidden transition-colors resize-none leading-relaxed"
                placeholder="توضیحات تکمیلی یا لینک‌ها..."
              />
            </div>

            {/* Project Selection (Move items between active projects or no project) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Folder className="w-3.5 h-3.5" />
                  <span>تخصیص به پروژه</span>
                </div>
                {item.legacyProjectLabel && !selectedProjectId && (
                  <span className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md">
                    برچسب قدیمی: {item.legacyProjectLabel}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedProjectId('')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                    selectedProjectId === ''
                      ? 'bg-violet-950/40 text-violet-300 border-violet-700/50'
                      : 'bg-[#121318] text-gray-400 border-[#2B2D3A] hover:text-gray-200'
                  }`}
                >
                  بدون پروژه
                </button>
                {projects
                  .filter((p) => !p.archived || p.id === selectedProjectId)
                  .map((p) => {
                    const isSelected = selectedProjectId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-[#252238] text-white border-violet-500/50'
                            : 'bg-[#121318] text-gray-300 border-[#2B2D3A] hover:bg-[#1A1B24]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.name}</span>
                        {p.archived && <span className="text-[10px] text-amber-400/80">(آرشیو شده)</span>}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Tags Input */}
            <div>
              <label htmlFor="edit-tags" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                <span>برچسب‌ها (با کاما جدا کنید)</span>
              </label>
              <input
                id="edit-tags"
                type="text"
                dir="auto"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#121318] border border-[#2B2D3A] focus:border-violet-500 rounded-xl text-xs text-gray-100 placeholder-gray-500 outline-hidden transition-colors"
                placeholder="مثال: گزارش، فوری، جلسه"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[#262835]">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف این مورد</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#222430] hover:bg-[#2A2C3A] rounded-lg transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-violet-900/30"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        itemTitle={item.title}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Date Picker Modal for Planned or Due Date */}
      {datePickerTarget && (
        <DatePickerModal
          isOpen={Boolean(datePickerTarget)}
          title={datePickerTarget === 'planned' ? 'انتخاب روز انجام' : 'انتخاب مهلت تحویل'}
          selectedDate={datePickerTarget === 'planned' ? plannedDate : dueDate}
          onSelectDate={(newDate) => {
            if (datePickerTarget === 'planned') {
              setPlannedDate(newDate);
            } else {
              setDueDate(newDate);
            }
            setDatePickerTarget(null);
          }}
          onClearDate={() => {
            if (datePickerTarget === 'planned') {
              setPlannedDate(undefined);
            } else {
              setDueDate(undefined);
            }
            setDatePickerTarget(null);
          }}
          onClose={() => setDatePickerTarget(null)}
        />
      )}

      {/* Confirmation modal if user completes task with open steps */}
      <CompleteTaskConfirmModal
        isOpen={isConfirmOpenStepsModalOpen}
        taskTitle={title || item.title}
        uncompletedCount={steps.filter((s) => s.text.trim().length > 0 && !s.completed).length}
        totalCount={steps.filter((s) => s.text.trim().length > 0).length}
        onCompleteAll={() => {
          const allDoneSteps = steps.map((s) => ({ ...s, completed: true }));
          setSteps(allDoneSteps);
          setStatus('done');
          setIsConfirmOpenStepsModalOpen(false);
          executeSave('done', allDoneSteps);
        }}
        onCompleteTaskOnly={() => {
          setStatus('done');
          setIsConfirmOpenStepsModalOpen(false);
          executeSave('done', steps);
        }}
        onCancel={() => {
          setIsConfirmOpenStepsModalOpen(false);
        }}
      />
    </>
  );
};
