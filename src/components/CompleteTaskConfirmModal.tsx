import React from 'react';
import { CheckCircle2, AlertCircle, X, CheckSquare } from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface CompleteTaskConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  uncompletedCount: number;
  totalCount: number;
  onCompleteAll: () => void;
  onCompleteTaskOnly: () => void;
  onCancel: () => void;
}

export const CompleteTaskConfirmModal: React.FC<CompleteTaskConfirmModalProps> = ({
  isOpen,
  taskTitle,
  uncompletedCount,
  totalCount,
  onCompleteAll,
  onCompleteTaskOnly,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-completion-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[#161720] border border-[#2D3044] rounded-2xl p-5 shadow-2xl space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#242636] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-completion-title" className="text-sm font-bold text-white leading-snug">
                انجام تسک با مراحل باز
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                تسک «{taskTitle}» دارای مراحل انجام‌نشده است.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-3 bg-[#12131A] rounded-xl border border-[#242636] text-xs text-gray-300 leading-relaxed flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            از کل {toPersianDigits(totalCount)} مرحله،{' '}
            <strong className="text-amber-300 font-semibold">{toPersianDigits(uncompletedCount)} مرحله</strong> هنوز تیک نخورده است. چطور مایلید ثبت شود؟
          </span>
        </div>

        {/* Action Choices */}
        <div className="space-y-2 pt-1">
          {/* Choice 1: Complete task and all steps */}
          <button
            type="button"
            onClick={onCompleteAll}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-md shadow-violet-950/50"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>تسک و همهٔ مراحل انجام شدند</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
              علامت‌گذاری همه
            </span>
          </button>

          {/* Choice 2: Complete task only */}
          <button
            type="button"
            onClick={onCompleteTaskOnly}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1C1E2A] hover:bg-[#252838] border border-[#2A2D40] text-gray-200 font-medium text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>فقط خود تسک انجام شد</span>
            </div>
            <span className="text-[10px] text-gray-400">مراحل باز باقی می‌مانند</span>
          </button>

          {/* Choice 3: Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 text-center text-xs text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            انصراف (بدون تغییر)
          </button>
        </div>
      </div>
    </div>
  );
};
