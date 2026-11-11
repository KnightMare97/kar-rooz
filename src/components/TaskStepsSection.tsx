import React, { useRef, useState, useEffect } from 'react';
import { TaskStep } from '../types';
import {
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface TaskStepsSectionProps {
  steps: TaskStep[];
  onChange: (steps: TaskStep[]) => void;
  isTaskCompleted: boolean;
  onSetTaskStatus?: (status: 'done' | 'todo') => void;
}

export const TaskStepsSection: React.FC<TaskStepsSectionProps> = ({
  steps,
  onChange,
  isTaskCompleted,
  onSetTaskStatus,
}) => {
  // Temporary input for new step at bottom
  const [newStepText, setNewStepText] = useState('');
  const [newStepFocused, setNewStepFocused] = useState(false);

  // Suggestions state
  const [showAllDonePrompt, setShowAllDonePrompt] = useState(false);
  const [showReopenPrompt, setShowReopenPrompt] = useState(false);

  // Refs for focusing inputs after Enter
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const focusTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusTargetIdRef.current) {
      const el = inputRefs.current.get(focusTargetIdRef.current);
      if (el) {
        el.focus();
        el.select();
      }
      focusTargetIdRef.current = null;
    }
  }, [steps]);

  // Meaningful non-empty steps
  const validSteps = steps.filter((s) => s.text.trim().length > 0);
  const totalCount = validSteps.length;
  const completedCount = validSteps.filter((s) => s.completed).length;

  const handleToggleStep = (index: number) => {
    const updated = steps.map((s, idx) => {
      if (idx === index) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    onChange(updated);

    const toggledStep = updated[index];
    const newCompletedCount = updated.filter((s) => s.text.trim().length > 0 && s.completed).length;
    const currentTotal = updated.filter((s) => s.text.trim().length > 0).length;

    // If step was checked and now ALL steps are completed, and task is not yet done:
    if (toggledStep.completed && newCompletedCount === currentTotal && currentTotal > 0 && !isTaskCompleted) {
      setShowAllDonePrompt(true);
      setShowReopenPrompt(false);
    } else {
      setShowAllDonePrompt(false);
    }

    // If step was unchecked in an already completed task:
    if (!toggledStep.completed && isTaskCompleted) {
      setShowReopenPrompt(true);
      setShowAllDonePrompt(false);
    } else if (isTaskCompleted && newCompletedCount === currentTotal) {
      setShowReopenPrompt(false);
    }
  };

  const handleUpdateStepText = (index: number, text: string) => {
    const updated = steps.map((s, idx) => {
      if (idx === index) {
        return { ...s, text };
      }
      return s;
    });
    onChange(updated);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      // Do not trigger while IME / Persian composition is active
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();

      // Create new step right after current index
      const newId = `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newStep: TaskStep = {
        id: newId,
        text: '',
        completed: false,
      };

      const updated = [...steps];
      updated.splice(index + 1, 0, newStep);
      focusTargetIdRef.current = newId;
      onChange(updated);
    }
  };

  const handleAddBottomStep = () => {
    const trimmed = newStepText.trim();
    if (!trimmed) return;

    const newStep: TaskStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
    };

    onChange([...steps, newStep]);
    setNewStepText('');
    setNewStepFocused(false);
  };

  const handleNewStepKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      handleAddBottomStep();
    }
  };

  return (
    <div className="p-3.5 bg-[#14151C] rounded-xl border border-[#262835] space-y-3 select-none">
      {/* Header with Title and Step Counter */}
      <div className="flex items-center justify-between pb-1 border-b border-[#20222D]">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-200">مراحل انجام</span>
          {totalCount > 0 && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                completedCount === totalCount
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  : 'bg-violet-950/30 text-violet-300 border-violet-800/30'
              }`}
            >
              {toPersianDigits(completedCount)} از {toPersianDigits(totalCount)} مرحله
            </span>
          )}
        </div>

        {totalCount === 0 && (
          <span className="text-[11px] text-gray-500">اختیاری</span>
        )}
      </div>

      {/* Suggestion 1: All steps done prompt */}
      {showAllDonePrompt && onSetTaskStatus && !isTaskCompleted && (
        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between gap-2 text-xs text-emerald-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>همهٔ مراحل تمام شد؛ تسک هم انجام‌شده شود؟</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSetTaskStatus('done');
                setShowAllDonePrompt(false);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              بله، انجام شد
            </button>
            <button
              type="button"
              onClick={() => setShowAllDonePrompt(false)}
              className="px-2 py-1 text-xs text-emerald-400 hover:text-white cursor-pointer"
            >
              خیر
            </button>
          </div>
        </div>
      )}

      {/* Suggestion 2: Reopen prompt when unchecking in completed task */}
      {showReopenPrompt && onSetTaskStatus && isTaskCompleted && (
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between gap-2 text-xs text-amber-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>یک مرحله دوباره باز شد؛ تسک هم به «در حال انجام» بازگردد؟</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSetTaskStatus('todo');
                setShowReopenPrompt(false);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              بازگرداندن تسک
            </button>
            <button
              type="button"
              onClick={() => setShowReopenPrompt(false)}
              className="px-2 py-1 text-xs text-amber-400 hover:text-white cursor-pointer"
            >
              ماندن در حالت انجام‌شده
            </button>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-1.5">
        {steps.map((step, index) => {
          return (
            <div
              key={step.id}
              className="group flex items-center gap-2 p-1.5 px-2 bg-[#171822] border border-[#252737] rounded-xl hover:border-[#35384D] transition-colors"
            >
              {/* Checkbox button */}
              <button
                type="button"
                onClick={() => handleToggleStep(index)}
                aria-label={step.completed ? 'علامت‌گذاری مرحله به عنوان انجام‌نشده' : 'علامت‌گذاری مرحله به عنوان انجام‌شده'}
                className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                  step.completed
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'border-gray-500 hover:border-violet-400 bg-transparent'
                }`}
              >
                {step.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              {/* Step Text Input */}
              <input
                ref={(el) => {
                  if (el) inputRefs.current.set(step.id, el);
                  else inputRefs.current.delete(step.id);
                }}
                type="text"
                dir="auto"
                value={step.text}
                onChange={(e) => handleUpdateStepText(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="عنوان مرحله..."
                className={`flex-1 bg-transparent border-0 px-1 py-0.5 text-xs text-gray-200 placeholder-gray-500 outline-hidden ${
                  step.completed ? 'line-through text-gray-400 decoration-gray-500' : ''
                }`}
              />

              {/* Accessible Reorder Controls (Touch and Keyboard Friendly) */}
              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveStep(index, index - 1)}
                  disabled={index === 0}
                  title="انتقال به بالا"
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveStep(index, index + 1)}
                  disabled={index === steps.length - 1}
                  title="انتقال به پایین"
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Explicit Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveStep(index)}
                  title="حذف این مرحله"
                  className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Step Row */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 bg-[#12131A] border border-[#232534] focus-within:border-violet-500 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <input
            type="text"
            dir="auto"
            value={newStepText}
            onChange={(e) => setNewStepText(e.target.value)}
            onFocus={() => setNewStepFocused(true)}
            onBlur={() => {
              if (!newStepText.trim()) {
                setNewStepFocused(false);
              }
            }}
            onKeyDown={handleNewStepKeyDown}
            placeholder="+ افزودن مرحله جدید (با Enter بعدی)"
            className="w-full bg-transparent border-0 text-xs text-gray-100 placeholder-gray-500 outline-hidden"
          />
        </div>

        {newStepText.trim().length > 0 && (
          <button
            type="button"
            onClick={handleAddBottomStep}
            className="px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            ثبت مرحله
          </button>
        )}
      </div>
    </div>
  );
};
